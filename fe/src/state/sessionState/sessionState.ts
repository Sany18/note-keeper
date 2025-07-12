import { atom, selector } from "recoil";

export const defaultSessionState = {
  isAppLoaded: false,
  showDropzone: false,
}

export const appState = atom({
  key: 'sessionState',
  default: defaultSessionState,
});

export const sessionSelector = selector({
  key: 'sessionSelector',
  get: ({ get }) => get(appState),
  set: ({ set, get }, newState: Partial<typeof defaultSessionState>) => {
    const currentState = get(appState);
    const nextState = {
      ...currentState,
      ...newState,
    };

    set(appState, nextState);
  },
});
