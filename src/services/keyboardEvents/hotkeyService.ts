export type HotkeyZone = 'global' | 'explorer' | 'viewer';
export type HotkeyRecord = { zone: HotkeyZone; combo: string; label: string };
type HotkeyHandler = (e: KeyboardEvent) => void;
type ZoneChangeListener = (zone: HotkeyZone | null) => void;
type HotkeyEntry = { handler: HotkeyHandler; label?: string };

const zoneHandlers = new Map<HotkeyZone, Map<string, HotkeyEntry>>();
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
  const combo = buildCombo(e);
  zoneHandlers.get('global')?.get(combo)?.handler(e);
  if (activeZone) zoneHandlers.get(activeZone)?.get(combo)?.handler(e);
});

export const hotkeyService = {
  register(zone: HotkeyZone, combo: string, handler: HotkeyHandler, label?: string): () => void {
    if (!zoneHandlers.has(zone)) zoneHandlers.set(zone, new Map());
    zoneHandlers.get(zone)!.set(combo, { handler, label });
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

  getActiveZone(): HotkeyZone | null {
    return activeZone;
  },

  getAll(): HotkeyRecord[] {
    const result: HotkeyRecord[] = [];
    const zoneOrder: HotkeyZone[] = ['global', 'explorer', 'viewer'];

    for (const zone of zoneOrder) {
      const entries = zoneHandlers.get(zone);
      if (!entries) continue;
      for (const [combo, { label }] of entries) {
        if (label) result.push({ zone, combo, label });
      }
    }
    return result;
  },
};
