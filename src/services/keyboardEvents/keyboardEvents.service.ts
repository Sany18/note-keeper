import { keyCodes } from "./keyCodes.const";

export const isCtrl = (e: KeyboardEvent) => e?.ctrlKey || e?.metaKey;

export const isShift = (e: KeyboardEvent) => e?.shiftKey;

export const isAlt = (e: KeyboardEvent) => e?.altKey;

export const isSpace = (e: KeyboardEvent) => e?.code === keyCodes.space;
