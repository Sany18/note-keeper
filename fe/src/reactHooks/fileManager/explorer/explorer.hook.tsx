import { useCallback } from "react";
import { createSingletonProvider } from "services/reactProvider/singletonProvider";

import { deepClone } from "services/byJSTypes/objectHelpers.service";
import { findElementInTree, updateTreeElement } from "services/tree/treeHelpers";

import { useRecoilState } from "recoil";
import { explorerSelector } from "state/localState/explorerState";

import { File } from "dtos/file.model";
import { RemoteStorageProviders } from "const/remoteStorageProviders/RemoteStorageProviders.enum";

export const _useExplorer = () => {
  const [explorerState, setExplorerState] = useRecoilState(explorerSelector);

  const fileTree = explorerState.fileTree[RemoteStorageProviders.GOORLE_DRIVE];

  const setExplorerInProgress = (inProgress: boolean) => {
    setExplorerState({ inProgress });
  }

  // TODO: Use providers dinamically
  const setTree = (tree) => {
    const fileTree = deepClone(explorerState.fileTree);
    fileTree[RemoteStorageProviders.GOORLE_DRIVE] = tree;

    setExplorerState({ fileTree });
  }

  const updateFileInTree = useCallback((file: File, provider?: RemoteStorageProviders) => {
    setTree(updateTreeElement(fileTree, file.id, file));
  }, [fileTree]);

  const getFileFromTreeById = useCallback((fileId: string) => {
    return findElementInTree(fileTree, fileId);
  }, [fileTree]);

  const getNeighborFileList = useCallback((file: File, provider?: RemoteStorageProviders) => {
    const parent = getFileFromTreeById(file.parents[0]);

    if (parent) {
      return parent.children;
    }

    return fileTree;
  }, [getFileFromTreeById, fileTree]);

  const toggleFolderInTree = useCallback((file: File, folderOpen?: boolean) => {
    const nextFolderState = folderOpen ?? !file.folderOpen;
    const newFilesTree = updateTreeElement(fileTree, file.id, { folderOpen: nextFolderState });

    setTree(newFilesTree);

    return nextFolderState;
  }, [fileTree]);

  return {
    fileTree,
    rootFolderId: explorerState.fileTree[RemoteStorageProviders.GOORLE_DRIVE][0]?.id,
    explorerState,
    isExplorerInProgress: explorerState.inProgress,
    setTree,
    setExplorerState,
    updateFileInTree,
    toggleFolderInTree,
    getNeighborFileList,
    getFileFromTreeById,
    setExplorerInProgress
  }
};

export const {
  Provider: ExplorerProvider,
  useValue: useExplorer,
} = createSingletonProvider(_useExplorer, 'Explorer');
