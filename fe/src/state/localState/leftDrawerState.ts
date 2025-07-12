import { atom, selector } from "recoil";

import { File } from "dtos/file.model";
import { LeftDrawerModes } from "const/leftDrawerModes";

export const defaultLeftDrawerState = {
  open: true,
  mode: LeftDrawerModes.Explorer,
  width: 300,
  fileToMove: null as File,
}

export const leftDrawerState = atom({
  key: 'leftDrawerState',
  default: defaultLeftDrawerState,
});

export const leftDrawerSelector = selector({
  key: 'leftDrawerSelector',
  get: ({ get }) => get(leftDrawerState),
  set: ({ set, get }, newState: Partial<typeof defaultLeftDrawerState>) => {
    const currentState = get(leftDrawerState);

    const nextState = {
      ...currentState,
      ...newState,
    }

    set(leftDrawerState, nextState);
  },
});
