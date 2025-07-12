import { atom, selector } from "recoil";

import { GDStorageQuota } from "dtos/googleDrive/storageQuota.dto";

export const defaultAppState = {
  storageQuota: {} as GDStorageQuota,
}

export const appState = atom({
  key: 'appState',
  default: defaultAppState,
});

export const appSelector = selector({
  key: 'appSelector',
  get: ({ get }) => get(appState),
  set: ({ set, get }, newState: Partial<typeof defaultAppState>) => {
    const currentState = get(appState);
    const nextState = {
      ...currentState,
      ...newState,
    };

    set(appState, nextState);
  },
});
