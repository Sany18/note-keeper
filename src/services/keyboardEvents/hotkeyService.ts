export type HotkeyZone = 'explorer' | 'viewer';
type HotkeyHandler = (e: KeyboardEvent) => void;
type ZoneChangeListener = (zone: HotkeyZone | null) => void;

const zoneHandlers = new Map<HotkeyZone, Map<string, HotkeyHandler>>();
const listeners = new Set<ZoneChangeListener>();
let activeZone: HotkeyZone | null = null;

const buildCombo = (e: KeyboardEvent): string => {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('ctrl');
  if (e.shiftKey) parts.push('shift');
  if (e.altKey) parts.push('alt');
  parts.push(e.code);
  return parts.join('+');
};

window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (!activeZone) return;
  const handlers = zoneHandlers.get(activeZone);
  if (!handlers) return;
  handlers.get(buildCombo(e))?.(e);
});

export const hotkeyService = {
  register(zone: HotkeyZone, combo: string, handler: HotkeyHandler): () => void {
    if (!zoneHandlers.has(zone)) zoneHandlers.set(zone, new Map());
    zoneHandlers.get(zone)!.set(combo, handler);
    return () => zoneHandlers.get(zone)?.delete(combo);
  },

  activateZone(zone: HotkeyZone): void {
    if (activeZone === zone) return;
    activeZone = zone;
    listeners.forEach(l => l(zone));
  },

  onZoneChange(listener: ZoneChangeListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
