import { Icon } from "components/Atoms/Icon/Icon";
import { useDeviceManager } from "reactHooks/device/useDeviceManager.hook";
import { useState } from "react";

import "../ExplorerListItem.css";
import "./MyDevices.css";

type Props = {
};

export const MyDevices: React.FC<Props> = () => {
  const { devices, currentDevice, isConnected, isLoading, error, refreshDevices } = useDeviceManager();
  const [expanded, setExpanded] = useState(false);

  const handleToggleExpanded = () => {
    setExpanded(!expanded);
    if (!expanded) {
      refreshDevices();
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return 'phone_android';
      case 'tablet':
        return 'tablet';
      case 'desktop':
      default:
        return 'computer';
    }
  };

  const getConnectionStatus = () => {
    if (isLoading) return 'Connecting...';
    if (!isConnected) return 'Disconnected';
    return `${devices.length} device${devices.length !== 1 ? 's' : ''} online`;
  };

  return (
    <div className="MyDevices">
      <div className='ListItem__content' onClick={handleToggleExpanded}>
        <div className='ListItem__leftPart'>
          <div className='ListItem__expand'>
            <Icon>{expanded ? 'expand_more' : 'chevron_right'}</Icon>
          </div>

          <div className="MyDevices__info">
            <div className="MyDevices__title">
              My devices
            </div>
            <div className="MyDevices__status">
              {getConnectionStatus()}
            </div>
          </div>
        </div>

        <div className='ListItem__rightPart'>
          <div className="MyDevices__indicators">
            {isConnected && (
              <div className="MyDevices__indicator MyDevices__indicator--connected">
                <Icon>wifi</Icon>
              </div>
            )}
            {!isConnected && (
              <div className="MyDevices__indicator MyDevices__indicator--disconnected">
                <Icon>wifi_off</Icon>
              </div>
            )}
            <Icon>devices</Icon>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="MyDevices__expandedContent">
          {error && (
            <div className="MyDevices__error">
              <Icon>error</Icon>
              <span>{error}</span>
            </div>
          )}

          {isLoading && (
            <div className="MyDevices__loading">
              <Icon>refresh</Icon>
              <span>Loading devices...</span>
            </div>
          )}

          {currentDevice && (
            <div className="MyDevices__currentDevice">
              <div className="MyDevices__deviceHeader">
                <Icon>star</Icon>
                <span>This Device</span>
              </div>
              <div className="MyDevices__device MyDevices__device--current">
                <div className="MyDevices__deviceIcon">
                  <Icon>{getDeviceIcon(currentDevice.type)}</Icon>
                </div>
                <div className="MyDevices__deviceInfo">
                  <div className="MyDevices__deviceName">{currentDevice.name}</div>
                  <div className="MyDevices__deviceDetails">
                    {currentDevice.os} • {currentDevice.browser}
                  </div>
                </div>
                <div className="MyDevices__deviceStatus">
                  <div className="MyDevices__statusDot MyDevices__statusDot--online"></div>
                  <span>Online</span>
                </div>
              </div>
            </div>
          )}

          {devices.length > 0 && (
            <div className="MyDevices__otherDevices">
              <div className="MyDevices__deviceHeader">
                <Icon>devices_other</Icon>
                <span>Other Devices</span>
              </div>
              {devices
                .filter(device => device.id !== currentDevice?.id)
                .map(device => (
                  <div key={device.id} className="MyDevices__device">
                    <div className="MyDevices__deviceIcon">
                      <Icon>{getDeviceIcon(device.type)}</Icon>
                    </div>
                    <div className="MyDevices__deviceInfo">
                      <div className="MyDevices__deviceName">{device.name}</div>
                      <div className="MyDevices__deviceDetails">
                        {device.os} • {device.browser}
                      </div>
                    </div>
                    <div className="MyDevices__deviceStatus">
                      <div className={`MyDevices__statusDot ${device.isOnline ? 'MyDevices__statusDot--online' : 'MyDevices__statusDot--offline'}`}></div>
                      <span>{device.isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {devices.length === 0 && !isLoading && !error && (
            <div className="MyDevices__empty">
              <Icon>devices</Icon>
              <span>No other devices found</span>
              <button onClick={refreshDevices} className="MyDevices__refreshButton">
                <Icon>refresh</Icon>
                Refresh
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
