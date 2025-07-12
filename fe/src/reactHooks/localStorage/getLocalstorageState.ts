import { storagePrefix } from "./storagePrefix.const";

export const getLocalstorageState = () => {
  const state = {} as any;

  Object.keys(localStorage).forEach((key) => {
    const item = localStorage.getItem(key);

    if (key.includes(storagePrefix)) {
      const parsedItem = item && JSON.parse(item);
      const origKey = key.replace(storagePrefix, "");

      state[origKey] = parsedItem;
    }
  });

  return state;
}
