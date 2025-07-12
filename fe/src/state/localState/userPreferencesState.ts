import { atom, selector } from "recoil";

export const userPreferencesDefaultState = {
  autosave: true,
}

export const userPreferencesState = atom({
  key: 'userPreferencesState',
  default: userPreferencesDefaultState,
});

export const userPreferencesSelector = selector({
  key: 'userPreferencesSelector',
  get: ({ get }) => get(userPreferencesState),
  set: ({ set, get }, newState: Partial<typeof userPreferencesDefaultState>) => {
    const currentState = get(userPreferencesState);

    const nextState = {
      ...currentState,
      ...newState,
    }

    set(userPreferencesState, nextState);
  },
});
