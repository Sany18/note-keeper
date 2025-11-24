import { useGapi } from "reactHooks/gapi/useGapi.hook";
import { useCallback } from "react";
import { LocalStorageKeys, useLocalStorage } from "reactHooks/localStorage/localStorage.hook";

import { log } from "services/log/log.service";
import { deepClone } from "services/byJSTypes/objectHelpers.service";

import { appSelector } from "state/localState/appState";
import { sessionSelector } from "state/sessionState/sessionState";
import { allStatesSelector } from "state/localState/allStates";
import { activeFileInfoSelector } from "state/localState/activeFile/activeFileInfoState";
import { useRecoilState, useSetRecoilState } from "recoil";

import { File } from "dtos/file.model";
import { activeFileContentSelector } from "state/localState/activeFile/activeFileContentState";

const ignoreStateKeys = [
  'isFileSavingToRemoteStorage',
  'isFileDownloadingFromRemoteStorage',
];

const maxLocalstorageSize = 5242880; // 5MB

export const useAppState = () => {
  const [appState, setAppState] = useRecoilState(appSelector);
  const [allStates, setAllState] = useRecoilState(allStatesSelector);
  const [sessionState, setSessionState] = useRecoilState(sessionSelector);
  const [currentInfoFile, setCurrentInfoFile] = useRecoilState(activeFileInfoSelector);
  const [activeFileContentState, setActiveFileContentState] = useRecoilState(activeFileContentSelector);

  const { executeAfterGapiInit, getFileInfo, getFile, rootId } = useGapi();

  const { setItem, getItem } = useLocalStorage();

  // Exported functions
  const saveAppState = useCallback(() => {
    const appStateToSave = _saveStateSkipRules(allStates);

    setItem(LocalStorageKeys.ALL_STATES, appStateToSave);
  }, [allStates, setItem]);

  const clearAppState = useCallback(() => {
    log.appEvent('Clear app state from localstorage');

    setItem(LocalStorageKeys.ALL_STATES, {});
  }, [setItem]);

  const _saveStateSkipRules = (appState) => {
    const appStateToSave = deepClone(appState);

    for (const state in appStateToSave) {
      for (const key in appStateToSave[state]) {
        if (ignoreStateKeys.includes(key)) delete appStateToSave[state][key];
      }
    }

    if (new Blob([JSON.stringify(appStateToSave.activeFileContentState)]).size >= maxLocalstorageSize) {
      appStateToSave.activeFileContentState = null;
    }

    return appStateToSave;
  }

  const _keepLocalFileVersion = async (allStates) => {
    // If no active file
    if (!allStates) {
      setCurrentInfoFile({
        changeFileInView: false,
        isFileUpdatedFromRemoteStorage: false,
        isFileChangedLocaly: false,
        isFileDownloadingFromRemoteStorage: false,
      });

      return;
    }

    const { activeFileInfoState, activeFileContentState } = allStates;

    if (!activeFileContentState) {
      _loadFileFromRS(allStates);
    } else {
      setCurrentInfoFile({
        ...(activeFileInfoState || {}),
        changeFileInView: true,
        isFileUpdatedFromRemoteStorage: false,
        isFileChangedLocaly: false,
        isFileDownloadingFromRemoteStorage: false,
      });
    }
  }

  const _loadFileFromRS = async (allStates) => {
    const { activeFileInfoState } = allStates;
    const fileInfoFromRemoteStorage = activeFileInfoState.fileInfoFromRemoteStorage

    const savedAppState = getItem(LocalStorageKeys.ALL_STATES);
    let filecontentFromRemoteStorage: string;

    setCurrentInfoFile({
      fileInfoFromRemoteStorage,
      isFileUpdatedFromRemoteStorage: true,
      isFileChangedLocaly: false,
      isFileDownloadingFromRemoteStorage: true,
    });

    try {
      filecontentFromRemoteStorage = await getFile(savedAppState.activeFileInfoState.fileInfoFromRemoteStorage);
    } catch (error) {
      setCurrentInfoFile({
        fileInfoFromRemoteStorage,
        isFileUpdatedFromRemoteStorage: false,
        isFileChangedLocaly: false,
        isFileDownloadingFromRemoteStorage: false,
        error,
      });

      return;
    }

    setActiveFileContentState(filecontentFromRemoteStorage);
    setCurrentInfoFile({
      changeFileInView: true,
      fileUpdatedFromRemoteStorageAt: fileInfoFromRemoteStorage.modifiedTime, // Temporary disabled
      isFileChangedLocaly: false,
      contentUpdatedLocalyAt: fileInfoFromRemoteStorage.modifiedTime,
      isFileDownloadingFromRemoteStorage: false,
    });
  }

  const _appWasUpdated = () => {
    const currentVersion = getItem(LocalStorageKeys.APP_VERSION);
    const newVersion = import.meta.env.VITE_VERSION;

    if (currentVersion !== newVersion) {
      log.appEvent('App version changed', { currentVersion, newVersion });
      setItem(LocalStorageKeys.APP_VERSION, newVersion);
      clearAppState();

      return true;
    }

    return false;
  }

  const _processActiveFile = async (allStates) => {
    const { activeFileInfoState } = allStates;

    if (!activeFileInfoState?.fileInfoFromRemoteStorage) return _keepLocalFileVersion(null);

    executeAfterGapiInit(async () => {
      let fileInfoFromRemoteStorage = await getFileInfo(activeFileInfoState.fileInfoFromRemoteStorage);

      fileInfoFromRemoteStorage = new File({
        ...fileInfoFromRemoteStorage,
        root: fileInfoFromRemoteStorage.parents[0] === rootId
      });

      log.appEvent('Current file info from GD', fileInfoFromRemoteStorage);

      const localFileLastUpdate = new Date(activeFileInfoState.contentUpdatedLocalyAt).getTime();
      const gdFileLastUpdate = new Date(fileInfoFromRemoteStorage.modifiedTime).getTime();

      if (gdFileLastUpdate > localFileLastUpdate) {
        await _loadFileFromRS(allStates);
      } else {
        _keepLocalFileVersion(allStates);
      }
    });
  }

  const loadAppState = async () => {
    const savedAppState = getItem(LocalStorageKeys.ALL_STATES);

    // App vesion changes during deployment
    // To avoid conflicts with the saved app state, we clear it
    if (!_appWasUpdated()) {
      if (savedAppState && Object.keys(savedAppState).length > 0) {
        log.appEvent('Load app state from localstorage', savedAppState);

        setAllState(savedAppState);

        await _processActiveFile(savedAppState);
      } else {
        log.appEvent('No current file info in saved app state');
      }
    }

    setSessionState({ isAppLoaded: true });
  }

  return {
    saveAppState,
    loadAppState,
    clearAppState,
  }
}
