import { useEffect, useState, useCallback } from 'react';
import { webSocketService, Device, DeviceInfo } from 'services/websocket/websocket.service';
import { useGoogleAuth } from 'reactHooks/gis/googleAuth.hook';
import { getUserInfo, generateUserHash, generateFallbackHash } from 'services/userInfo/userInfo.service';

export interface UseDeviceManagerReturn {
  devices: Device[];
  currentDevice: Device | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  registerDevice: () => void;
  refreshDevices: () => void;
  requestFileTransfer: (toDeviceId: string, file: File) => void;
}

export const useDeviceManager = (): UseDeviceManagerReturn => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [currentDevice, setCurrentDevice] = useState<Device | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { currentUser } = useGoogleAuth();

  // Generate user hash - improved approach to get stable user identity
  const getUserHash = useCallback(async () => {
    if (!currentUser?.loggedIn || !currentUser?.googleAccessTokenToGD?.access_token) {
      console.log('User not logged in or no access token available');
      return null;
    }

    const accessToken = currentUser.googleAccessTokenToGD.access_token;

    try {
      // First try to use stored user info if available
      let userInfo = currentUser.userInfo;

      if (!userInfo || (!userInfo.id && !userInfo.email)) {
        // If no stored user info, try to get it from Google APIs
        console.log('No stored user info, fetching from Google APIs...');
        userInfo = await getUserInfo(accessToken);
      }

      if (userInfo && (userInfo.id || userInfo.email)) {
        // Use stable user information to generate hash
        console.log('Using stable user info for hash generation');
        return await generateUserHash(userInfo);
      } else {
        console.warn('Could not get stable user info, falling back to token-based hash');
        // Fallback to token-based hash (less stable but works)
        return await generateFallbackHash(accessToken);
      }
    } catch (error) {
      console.error('Error generating user hash:', error);
      // Last resort fallback
      return await generateFallbackHash(accessToken);
    }
  }, [currentUser?.googleAccessTokenToGD?.access_token, currentUser?.userInfo]);

  // Register device with backend
  const registerDevice = useCallback(async () => {
    console.log('Attempting to register device...');
    const userHash = await getUserHash();
    if (!userHash) {
      console.error('Failed to get user hash - user not authenticated');
      setError('User not authenticated');
      return;
    }

    console.log('User hash obtained, registering device...');
    const deviceInfo: DeviceInfo = webSocketService.getDeviceInfo();
    console.log('Device info:', deviceInfo);

    webSocketService.registerDevice(userHash, deviceInfo);
    console.log('Device registration request sent');
  }, [getUserHash]);

  // Refresh devices list
  const refreshDevices = useCallback(async () => {
    const userHash = await getUserHash();
    if (!userHash) {
      setError('User not authenticated');
      return;
    }

    webSocketService.getMyDevices(userHash);
  }, [getUserHash]);

  // Request file transfer
  const requestFileTransfer = useCallback((toDeviceId: string, file: File) => {
    if (!currentDevice) {
      setError('Current device not registered');
      return;
    }

    const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    webSocketService.requestFileTransfer({
      transferId,
      fromDeviceId: currentDevice.id,
      toDeviceId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });
  }, [currentDevice]);

  // Initialize WebSocket connection when user logs in
  useEffect(() => {
    const initializeWebSocket = async () => {
      try {
        console.log('Initializing WebSocket connection...');
        setIsLoading(true);
        setError(null);

        await webSocketService.connect();
        console.log('WebSocket connected successfully');
        setIsConnected(true);

        // Set up event listeners
        webSocketService.on('device-registered', (device: Device) => {
          console.log('Device registered successfully:', device);
          setCurrentDevice(device);
        });

        webSocketService.on('my-devices', (deviceList: Device[]) => {
          console.log('Received devices list:', deviceList);
          setDevices(deviceList);
        });

        webSocketService.on('devices-updated', (deviceList: Device[]) => {
          console.log('Devices updated:', deviceList);
          setDevices(deviceList);
        });

        webSocketService.on('file-transfer-request', (request: any) => {
          console.log('File transfer request received:', request);
          // Handle file transfer request (show modal, etc.)
        });

        webSocketService.on('transfer-error', (error: { transferId: string; message: string }) => {
          console.error('Transfer error:', error);
          setError(`Transfer error: ${error.message}`);
        });

        // Auto-register device after connection is established
        console.log('Auto-registering device...');
        await registerDevice();

      } catch (err) {
        console.error('Failed to connect to WebSocket:', err);
        setError('Failed to connect to server');
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    const cleanup = () => {
      console.log('Cleaning up WebSocket connection...');
      webSocketService.disconnect();
      setIsConnected(false);
      setCurrentDevice(null);
      setDevices([]);
    };

    if (currentUser?.loggedIn) {
      console.log('Current user is logged in, initializing WebSocket...');
      initializeWebSocket();
    } else {
      console.log('Current user not logged in, cleaning up...');
      cleanup();
    }

    return cleanup;
  }, [currentUser?.loggedIn, registerDevice]);

  // Periodic ping to maintain connection
  useEffect(() => {
    if (!isConnected) return;

    const pingInterval = setInterval(() => {
      webSocketService.ping();
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(pingInterval);
  }, [isConnected]);

  // Handle page unload - mark device as offline
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isConnected) {
        webSocketService.disconnect();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isConnected]);

  return {
    devices,
    currentDevice,
    isConnected,
    isLoading,
    error,
    registerDevice,
    refreshDevices,
    requestFileTransfer,
  };
};
