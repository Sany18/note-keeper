import { useEffect, useRef, useState } from "react";

import { Icon } from "components/Atoms/Icon/Icon";
import { hotkeyService, HotkeyZone } from "services/keyboardEvents/hotkeyService";
import { isMac } from "services/clientDevice/getPlatform";

import "./HotkeyHelp.css";

const codeMap: Record<string, string> = {
  ctrl: isMac ? '⌘' : 'Ctrl',
  shift: 'Shift',
  alt: isMac ? '⌥' : 'Alt',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Enter: 'Enter',
  Escape: 'Esc',
  Tab: 'Tab',
  Space: 'Space',
  BracketLeft: '[',
  BracketRight: ']',
};

const formatPart = (part: string): string => {
  if (part in codeMap) return codeMap[part];
  if (part.startsWith('Key')) return part.slice(3);
  return part;
};

const formatCombo = (combo: string): string =>
  combo.split('+').map(formatPart).join('+');

const zoneLabels: Record<HotkeyZone, string> = {
  global: 'Global',
  explorer: 'File Explorer',
  viewer: 'File Viewer',
};

export const HotkeyHelp: React.FC = () => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const hotkeys = open ? hotkeyService.getAll() : [];
  const grouped = hotkeys.reduce<Partial<Record<HotkeyZone, typeof hotkeys>>>((acc, h) => {
    (acc[h.zone] ??= []).push(h);
    return acc;
  }, {});

  return (
    <div className="HotkeyHelp" ref={containerRef}>
      <button
        className="Header__icon-button HotkeyHelp__trigger"
        onClick={() => setOpen(o => !o)}
        title="Keyboard shortcuts">
        <Icon size="1.25rem">keyboard</Icon>
      </button>

      {open && (
        <div className="HotkeyHelp__panel">
          {((['global', 'explorer', 'viewer'] as HotkeyZone[])).map(zone => {
            const entries = grouped[zone];
            if (!entries?.length) return null;
            return (
              <div key={zone} className="HotkeyHelp__group">
                <div className="HotkeyHelp__zone-title">{zoneLabels[zone]}</div>
                {entries.map(({ combo, label }) => (
                  <div key={combo} className="HotkeyHelp__row">
                    <kbd className="HotkeyHelp__combo">{formatCombo(combo)}</kbd>
                    <span className="HotkeyHelp__label">{label}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
