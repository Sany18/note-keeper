import { useExplorer } from "reactHooks/fileManager/explorer/explorer.hook";
import { useActiveFile } from "reactHooks/fileManager/activeFile/activeFile.hook";
import { useGoogleAuth } from "reactHooks/gis/googleAuth.hook";
import { createSingletonProvider } from "services/reactProvider/singletonProvider";
import { useCallback, useEffect, useMemo, useState } from "react";

import { log } from "services/log/log.service";
import { appendChildToFolder, getQniqueFilesAndUpdateOld, getRootId, updateTreeElement } from "services/tree/treeHelpers";

import { appSelector } from "state/localState/appState";
import { useRecoilState } from "recoil";
import { sessionSelector } from "state/sessionState/sessionState";
import { explorerSelector } from "state/localState/explorerState";
import { fileUploadingSelector } from "state/sessionState/fileUploadingState";

import { File } from "../../dtos/file.model";
import { getList } from "./googleDriveCRUD/getList";
import { getGDFile } from "./googleDriveCRUD/getFile";
import { deleteFile } from "./googleDriveCRUD/deleteFile";
import { renameFile } from "./googleDriveCRUD/renameFile";
import { updateFile } from "./googleDriveCRUD/updateFile";
import { AllGDscopes } from "const/remoteStorageProviders/googleDrive/GDScopes";
import { uploadFiles } from "./googleDriveCRUD/uploadFIles";
import { createGDFile } from "./googleDriveCRUD/createFile";
import { getGDFileInfo } from "./googleDriveCRUD/getFileInfo";
import { MimeTypesEnum } from "const/mimeTypes/mimeTypes.const";
import { GDStorageQuota } from "dtos/googleDrive/storageQuota.dto";
import { deleteFileForever } from "./googleDriveCRUD/deleteFIleForever";
import { openPickerForFile } from "./googleDriveCRUD/filePicker";
import { changeGDFileParent } from "./googleDriveCRUD/changeFileParent";
import { useGapiErrorHandler } from "./gapi-error-handler.hook";
import { getAllFromRootParams, getChildrenParams } from "const/remoteStorageProviders/googleDrive/gapi.parameters";
import googleDriveSvg from "assets/icons/google-drive.svg";

let gapiCallbacks = [];

export const _useGapi = () => {
  const [sessionState] = useRecoilState(sessionSelector);
  const [filesListState] = useRecoilState(explorerSelector);
  const [appState, setAppState] = useRecoilState(appSelector);
  const [fileUploading, setFileUploading] = useRecoilState(fileUploadingSelector);

  const [gapiInitialized, setGapiInitialized] = useState(false);

  const { handleError } = useGapiErrorHandler();
  const { currentUser } = useGoogleAuth();
  const { fileTree, explorerState, setTree, setExplorerInProgress, setExplorerState } = useExplorer();
  const { setActiveFileInfo } = useActiveFile();

  const rootId = useMemo(() => getRootId(fileTree), [fileTree?.length]);

  // Initialize gapi
  useEffect(() => {
    log.appEvent('Initializing gapi...');

    const initGapi = () => {
      window.gapi.load('client:auth2', async () => {
        try {
          // Here is nothing to return
          await window.gapi.client.init({
            apiKey: process.env.VITE_GOOGLE_WEB_API_KEY,
            clientId: process.env.VITE_GOOGLE_CLIENT_ID,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
            scope: AllGDscopes.join(' '),
            pluginName: 'gapi.auth2',
          });

          window.gapi.load('picker');

          log.appEvent('Gapi initialized');
          setGapiInitialized(true);
        } catch (error) {
          handleError('initGapi', error);
        }
      });
    }

    // @ts-ignore
    window.initGapi = initGapi;

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.onload = initGapi;
    document.body.appendChild(script);
  }, [setGapiInitialized]);

  useEffect(() => {
    if (gapiInitialized && gapiCallbacks.length) {
      gapiCallbacks.forEach(cb => cb());
      gapiCallbacks = [];
    }
  }, [gapiInitialized, gapiCallbacks]);

  const executeAfterGapiInit = useCallback((callback: () => void) => {
    if (gapiInitialized) {
      callback();
    } else {
      gapiCallbacks.push(callback);
    }
  }, [gapiInitialized, gapiCallbacks]);

  // Get quota info
  useEffect(() => {
    executeAfterGapiInit(() => {
      getGDInfo().then(response => {
        const storageQuota = new GDStorageQuota(response?.result.storageQuota);

        setAppState({ storageQuota });
      });
    });
  }, []);

  const getGDList = useCallback(getList({ handleError }), [handleError]);

  const getFile = useCallback(getGDFile({ handleError }), [handleError]);

  const getFileInfo = useCallback(getGDFileInfo({ handleError }), [handleError]);

  const updateGDFile = useCallback(updateFile({ setCurrentFile: setActiveFileInfo, handleError }), [handleError]);

  const changeFileParent = useCallback(changeGDFileParent({ handleError }), [handleError]);

  const deleteGDFile = useCallback(deleteFile({ handleError }), [handleError]);

  const deleteGDFileForever = useCallback(deleteFileForever({ handleError }), [handleError]);

  const renameGDFile = useCallback(renameFile({ handleError }), [handleError]);

  const createFile = useCallback(createGDFile({ handleError }), [handleError]);

  const uploadFileToGD = useCallback(uploadFiles({ handleError }), [handleError]);

  const fetchChildrenList = useCallback(async (fileFromList: File) => {
    try {
      const currentFileChildrenList = await getGDList(getChildrenParams(fileFromList.id));
      const newThree = updateTreeElement(
        fileTree,
        fileFromList.id,
        {
          ...fileFromList,
          children: getQniqueFilesAndUpdateOld(fileFromList.children || [], currentFileChildrenList),
          folderOpen: true
        }
      );

      setTree(newThree);

      return newThree;
    } catch (error) {
      log.error('App: Error getting children list', error);
      setExplorerState({ error });
    }
  }, [explorerState, fileTree, setExplorerState]);

  const _GDStorageQuota = useMemo(() => {
    const { usagePercent, limitStr, usageStr } = appState.storageQuota;

    if (!usagePercent) return null;

    return `Google Drive: ${usagePercent || 0}% used | ${usageStr || 0} of ${limitStr || 0}`;
  }, [appState.storageQuota]);

  const createGDWrapperFolder = useCallback((children) => {
    return new File({
      ...children[0],
      id: children[0].parents[0] || 'root',
      name: 'Google Drive',
      title: _GDStorageQuota,
      parents: [],
      children,
      mimeType: MimeTypesEnum.Folder,
      iconLink: googleDriveSvg,
      draggable: false,
    });
  }, [_GDStorageQuota]);

  const fetchRootFilesList = useCallback(async () => {
    log.appEvent('App: fetching root files list');

    try {
      const freshListOfRootEntities = await getGDList(getAllFromRootParams);
      freshListOfRootEntities.forEach(e => e.root = true);
      const wrappedRootFolder = [createGDWrapperFolder(freshListOfRootEntities)];

      const allUniqueEntities = getQniqueFilesAndUpdateOld(fileTree, wrappedRootFolder);

      allUniqueEntities.forEach(childListElement => {
        if (childListElement.mimeType === MimeTypesEnum.Folder && childListElement.folderOpen) {
          fetchChildrenList(childListElement);
        }
      });

      setTree(allUniqueEntities);
    } catch (error) {
      log.error('App: Error getting root files list', error);
      setExplorerState({ error });
    }
  }, [sessionState.isAppLoaded, gapiInitialized, getGDList, setExplorerState]);

  /////////////////////////////////////////////
  // Upload batch of files to Google Drive
  /////////////////////////////////////////////
  useEffect(() => {
    if (fileUploading.filesToUpload.length) {
      let latestFileTree = fileTree;

      fileUploading.filesToUpload.forEach(file => {
        uploadFileToGD(file.file, [file.parentId])
          .then(response => {
            const newFile = new File(response.result);
            const finished = fileUploading.totalFiles ===
              fileUploading.successfulUploads.length + fileUploading.failedUploads.length;

            setFileUploading({
              progress: fileUploading.progress + 1,
              inProgress: finished ? false : true,
              totalFiles: finished ? 0 : fileUploading.totalFiles,
              successfulUploads: finished ? [] : [...fileUploading.successfulUploads, file],
              finished
            });

            latestFileTree = appendChildToFolder(latestFileTree, file.parentId, newFile, true);

            setTree(latestFileTree);
          })
          .catch(error => {
            const finished = fileUploading.totalFiles ===
              fileUploading.successfulUploads.length + fileUploading.failedUploads.length;

            setFileUploading({
              progress: fileUploading.progress + 1,
              inProgress: finished ? false : true,
              totalFiles: finished ? 0 : fileUploading.totalFiles,
              failedUploads: finished ? [] : [...fileUploading.failedUploads, file],
              finished
            });
          });
      });

      setFileUploading({
        totalFiles: fileUploading.totalFiles + fileUploading.filesToUpload.length,
        finished: false,
        inProgress: true,
        filesToUpload: [],
      });
    }
  }, [filesListState.fileTree, fileUploading, uploadFileToGD]);

  // Get quota info
  const getGDInfo = useCallback(async () => {
    try {
      return await window.gapi.client.drive.about.get({
        fields: 'storageQuota'
      });
    } catch (error) {
      handleError('getGDInfo', error);
    }
  }, [gapiInitialized, handleError]);

    //////////////////////////////////////////
  // Get root files list on app load
  //////////////////////////////////////////
  useEffect(() => {
    if (sessionState.isAppLoaded && gapiInitialized && currentUser.loggedIn) {
      fetchRootFilesList();
    }
  }, [sessionState.isAppLoaded, gapiInitialized, currentUser.loggedIn]);

  return {
    rootId,
    gapiInitialized,
    getFile,
    getGDList,
    getGDInfo,
    createFile,
    getFileInfo,
    renameGDFile,
    updateGDFile,
    deleteGDFile,
    uploadFileToGD,
    changeFileParent,
    fetchChildrenList,
    openPickerForFile,
    fetchRootFilesList,
    deleteGDFileForever,
    executeAfterGapiInit,
  }
}

export const {
  Provider: GapiProvider,
  useValue: useGapi,
} = createSingletonProvider(_useGapi, 'Gapi');
