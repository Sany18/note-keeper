import { useEffect, useState, useCallback } from 'react';
import { webSocketService, Device, DeviceInfo } from 'services/websocket/websocket.service';
import { useGoogleAuth } from 'reactHooks/gis/googleAuth.hook';

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

  // Generate user hash similar to backend
  const getUserHash = useCallback(async () => {
    if (!currentUser?.loggedIn || !currentUser?.googleAccessTokenToGD) {
      console.log('User not logged in or no access token available');
      return null;
    }

    // Try to use userInfo if available, otherwise use token info
    let userIdentifier;
    if (currentUser.userInfo && currentUser.userInfo.email) {
      userIdentifier = {
        email: currentUser.userInfo.email,
        id: currentUser.userInfo.id,
        name: currentUser.userInfo.name,
      };
    } else {
      // Fallback: use access token as identifier
      userIdentifier = {
        email: 'unknown',
        id: currentUser.googleAccessTokenToGD.access_token.slice(0, 20), // Use part of token as ID
        name: 'Unknown User',
      };
    }

    const userString = JSON.stringify(userIdentifier);
    console.log('Generating hash for user:', userIdentifier);

    // Use browser's crypto API for hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(userString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log('Generated user hash:', hashHex);
    return hashHex;
  }, [currentUser]);

  const registerDevice = useCallback(async () => {
    console.log('Attempting to register device...');
    const userHash = await getUserHash();
    if (!userHash) {
      console.error('Failed to get user hash');
      setError('User not authenticated');
      return;
    }

    console.log('User hash obtained:', userHash);
    const deviceInfo: DeviceInfo = webSocketService.getDeviceInfo();
    console.log('Device info:', deviceInfo);

    webSocketService.registerDevice(userHash, deviceInfo);
    console.log('Device registration request sent');
  }, [getUserHash]);

  const refreshDevices = useCallback(async () => {
    const userHash = await getUserHash();
    if (!userHash) {
      setError('User not authenticated');
      return;
    }

    webSocketService.getMyDevices(userHash);
  }, [getUserHash]);

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

  // Initialize WebSocket connection
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

        // Auto-register device if user is logged in
        if (currentUser?.loggedIn) {
          console.log('User is logged in, auto-registering device...');
          await registerDevice();
        } else {
          console.log('User not logged in, skipping auto-registration');
        }

      } catch (err) {
        console.error('Failed to connect to WebSocket:', err);
        setError('Failed to connect to server');
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser?.loggedIn) {
      console.log('Current user is logged in, initializing WebSocket...');
      initializeWebSocket();
    } else {
      console.log('Current user not logged in, WebSocket initialization skipped');
    }

    return () => {
      console.log('Disconnecting WebSocket...');
      webSocketService.disconnect();
      setIsConnected(false);
    };
  }, [currentUser?.loggedIn, registerDevice]);

  // Periodic ping to maintain connection
  useEffect(() => {
    if (!isConnected) return;

    const pingInterval = setInterval(() => {
      webSocketService.ping();
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(pingInterval);
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
