import { useCallback, useEffect, useState } from 'react';

import { hotkeyService, HotkeyZone } from './hotkeyService';

export const useHotkeyZone = (zone: HotkeyZone) => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    return hotkeyService.onZoneChange((activeZone) => setIsActive(activeZone === zone));
  }, [zone]);

  const activate = useCallback(() => hotkeyService.activateZone(zone), [zone]);

  return { activate, isActive };
};
