import { useEffect, useRef } from 'react';

import { hotkeyService, HotkeyZone } from './hotkeyService';

export const useHotkey = (zone: HotkeyZone, combo: string, handler: (e: KeyboardEvent) => void): void => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    return hotkeyService.register(zone, combo, (e) => handlerRef.current(e));
  }, [zone, combo]);
};
