import { DefaultValue, selector } from "recoil";

import { appSelector, appState, defaultAppState } from "./appState";
import { activeFileInfoSelector, activeFileInfoState, defaultActiveFileInfoState } from "./activeFile/activeFileInfoState";
import { defaultExplorerState, explorerSelector, explorerState } from "./explorerState";
import { defaultLeftDrawerState, leftDrawerSelector, leftDrawerState } from "./leftDrawerState";
import { activeFileContentSelector, activeFileContentState, defaultFileContentState } from "./activeFile/activeFileContentState";

export const defaultAllStates = {
  appState: defaultAppState,
  explorerState: defaultExplorerState,
  leftDrawerState: defaultLeftDrawerState,
  activeFileInfoState: defaultActiveFileInfoState,
  activeFileContentState: defaultFileContentState
};

export const allStatesSelector = selector({
  key: 'allStates',
  get: ({ get }) => {
    return {
      appState: get(appState),
      explorerState: get(explorerState),
      leftDrawerState: get(leftDrawerState),
      activeFileInfoState: get(activeFileInfoState),
      activeFileContentState: get(activeFileContentState),
    };
  },
  set: ({ set }, newValue) => {
    if (newValue instanceof DefaultValue) {
      return;
    }

    if (newValue.appState) set(appSelector, newValue.appState);
    if (newValue.explorerState) set(explorerSelector, newValue.explorerState);
    if (newValue.leftDrawerState) set(leftDrawerSelector, newValue.leftDrawerState);
    if (newValue.activeFileInfoState) set(activeFileInfoSelector, newValue.activeFileInfoState);
    if (newValue.activeFileContentState) set(activeFileContentSelector, newValue.activeFileContentState);
  }
});
