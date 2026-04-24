import { atom, selector } from "recoil";

export let defaultFileContentState = null;

export const activeFileContentState = atom({
  key: 'activeFileContentState',
  default: defaultFileContentState,
});

export const activeFileContentSelector = selector({
  key: 'activeFileContentSelector',
  get: ({ get }) => get(activeFileContentState),
  set: ({ set }, newState: string | Blob) => {
    set(activeFileContentState, newState);
  },
});
