import { storagePrefix } from "./storagePrefix.const";

export const getLocalstorageState = () => {
  const state = {} as any;

  Object.keys(localStorage).forEach((key) => {
    const item = localStorage.getItem(key);

    if (key.includes(storagePrefix)) {
      let parsedItem: any;
      try { parsedItem = item ? JSON.parse(item) : undefined; } catch { parsedItem = undefined; }
      const origKey = key.replace(storagePrefix, "");

      state[origKey] = parsedItem;
    }
  });

  return state;
}
