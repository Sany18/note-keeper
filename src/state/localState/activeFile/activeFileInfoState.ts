import { atom, selector } from "recoil";

import { File } from "dtos/file.model";
import { ViewerType } from "components/FileViewers/FileViewers.types";

export const defaultActiveFileInfoState = {
  fileInfoFromRemoteStorage: null as File,
  fileUpdatedFromRemoteStorageAt: null,
  isFileUpdatedFromRemoteStorage: false,

  changeFileInView: false,

  isFileSavedLocaly: false,
  isFileChangedLocaly: false,
  isFileSavedToRemoteStorage: true,
  isFileSavingToRemoteStorage: false,
  isFileDownloadingFromRemoteStorage: false,

  contentUpdatedLocalyAt: null,

  viewType: null as ViewerType,

  error: null,
}

export const activeFileInfoState = atom({
  key: 'activeFileInfoState',
  default: defaultActiveFileInfoState,
});

export const activeFileInfoSelector = selector({
  key: 'activeFileInfoSelector',
  get: ({ get }) => get(activeFileInfoState),
  set: ({ set, get }, newState: Partial<typeof defaultActiveFileInfoState>) => {
    if (newState == null) {
      set(activeFileInfoState, defaultActiveFileInfoState);
      return;
    }

    const currentState = get(activeFileInfoState);
    const nextState = {
      ...currentState,
      ...newState,
      fileUpdatedFromGDAt: newState.fileInfoFromRemoteStorage?.modifiedTime,
    }

    set(activeFileInfoState, nextState);
  },
});
