import { atom, selector } from "recoil";

import { File } from "dtos/file.model";
import { RemoteStorageProviders } from "const/remoteStorageProviders/RemoteStorageProviders.enum";

export const defaultExplorerState = {
  fileTree: {
    [RemoteStorageProviders.GOORLE_DRIVE]: [],
    [RemoteStorageProviders.LOCAL_MACHINE]: [],
  },
  activeFileModel: null as File, // In the viewer

  inProgress: false,

  error: null,
}

export const explorerState = atom({
  key: 'explorerState',
  default: defaultExplorerState,
});

export const explorerSelector = selector({
  key: 'explorerSelector',
  get: ({ get }) => get(explorerState),
  set: ({ set, get }, newState: Partial<typeof defaultExplorerState>) => {
    const currentState = get(explorerState);

    const nextState = {
      ...currentState,
      ...newState,
    }

    set(explorerState, nextState);
  },
});
