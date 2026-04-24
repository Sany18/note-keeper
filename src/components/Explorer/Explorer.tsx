import { useGapi } from 'reactHooks/gapi/useGapi.hook';
import { useExplorer } from 'reactHooks/fileManager/explorer/explorer.hook';
import { useGoogleAuth } from 'reactHooks/gis/googleAuth.hook';
import { useActiveFile } from 'reactHooks/fileManager/activeFile/activeFile.hook';
import { useUploadFiles } from 'reactHooks/gapi/useUploadFiles.hook';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useRecoilState } from 'recoil';

import { log } from 'services/log/log.service';
import { isCtrl } from 'services/keyboardEvents/keyboardEvents.service';
import { getDOMParrentElement } from 'services/DOM/getParentElementByClassName';
import { getClosestParentFolder } from 'services/tree/treeHelpers';

import { appSelector } from 'state/localState/appState';
import { sessionSelector } from 'state/sessionState/sessionState';
import { explorerSelector } from 'state/localState/explorerState';
import { leftDrawerSelector } from 'state/localState/leftDrawerState';

import { Icon } from 'components/Atoms/Icon/Icon';
import { File } from 'dtos/file.model';
import { Spinner } from 'components/Spinner/Spinner';
import { ListItem } from './ListItem/ListItem';
import { ContextMenu } from './ContextMenu/ContextMenu';
import { MimeTypesEnum } from 'const/mimeTypes/mimeTypes.const';
import { mainFolderName } from 'const/remoteStorageProviders/googleDrive/mainFolderName';
import { LeftDrawerModes } from 'const/leftDrawerModes';

import './Explorer.css';

type Props = {};

type WebkitFileEntry = {
  isFile: true;
  isDirectory: false;
  file: (successCallback: (file: globalThis.File) => void, errorCallback?: (error: unknown) => void) => void;
};

type WebkitDirectoryEntry = {
  isFile: false;
  isDirectory: true;
  createReader: () => {
    readEntries: (
      successCallback: (entries: WebkitEntry[]) => void,
      errorCallback?: (error: unknown) => void
    ) => void;
  };
};

type WebkitEntry = WebkitFileEntry | WebkitDirectoryEntry;

const readDirectoryEntries = (directoryEntry: WebkitDirectoryEntry): Promise<WebkitEntry[]> => {
  const reader = directoryEntry.createReader();

  return new Promise((resolve, reject) => {
    const collectedEntries: WebkitEntry[] = [];

    const readChunk = () => {
      reader.readEntries((entries) => {
        if (!entries.length) {
          resolve(collectedEntries);
          return;
        }

        collectedEntries.push(...entries);
        readChunk();
      }, reject);
    };

    readChunk();
  });
};

const getFilesFromEntry = async (entry: WebkitEntry): Promise<globalThis.File[]> => {
  if (entry.isFile) {
    return new Promise((resolve, reject) => {
      entry.file((file) => resolve([file]), reject);
    });
  }

  if (entry.isDirectory) {
    const entries = await readDirectoryEntries(entry);
    const nestedFiles = await Promise.all(entries.map(getFilesFromEntry));

    return nestedFiles.flat();
  }

  return [];
};

const getDroppedFiles = async (dataTransfer: DataTransfer): Promise<globalThis.File[]> => {
  const dataTransferItems = Array.from(dataTransfer.items || []);
  const webkitEntries = dataTransferItems
    .map(item => (item as DataTransferItem & { webkitGetAsEntry?: () => WebkitEntry | null }).webkitGetAsEntry?.())
    .filter(Boolean) as unknown as WebkitEntry[];

  if (webkitEntries.length) {
    const filesByEntry = await Promise.all(webkitEntries.map(getFilesFromEntry));

    return filesByEntry.flat();
  }

  return Array.from(dataTransfer.files || []);
};

const isExternalFilesDrop = (e: DragEvent): boolean => {
  return Array.from(e.dataTransfer?.types || []).includes('Files');
};

export const Explorer: React.FC<Props> = () => {
  const [appState] = useRecoilState(appSelector);
  const [sessionState] = useRecoilState(sessionSelector);
  const [, setFilesState] = useRecoilState(explorerSelector);
  const [drawerState, setDrawerState] = useRecoilState(leftDrawerSelector);

  const { activeFileModel, setActiveFileModel, setActiveFileInfo } = useActiveFile();
  const { isExplorerInProgress, fileTree, rootFolderId, updateFileInTree, getFileFromTreeById } = useExplorer();

  const { renameGDFile, changeFileParent, fetchRootFilesList } = useGapi();
  const { requestAdditionalScopes, currentUser } = useGoogleAuth();
  const { inProgress: fileUploadingInProgress, openUploadDialog, uploadFiles } = useUploadFiles();

  const [contextMenuEvent, setContextMenuEvent] = useState<any>(false);

  const drawerRef = useRef<HTMLDivElement>(null);
  const resizeBarRef = useRef<HTMLDivElement>(null);

  const minWidth = 120; // px
  const defaultWidth = Math.min(300, window.innerWidth - minWidth);

  const moveFileToMode = drawerState.mode === LeftDrawerModes.FileMoveTo;

  ////////////////////////////
  // Buisness logic
  ////////////////////////////
  const getListElement = useCallback((element: HTMLElement) => {
    return getDOMParrentElement(element, 'ListItem');
  }, []);

  const renameActiveFile = useCallback(() => {
    const newName = window.prompt(
      `Rename "${activeFileModel.name}" to:`,
      activeFileModel.name
    );

    if (!newName) return;

    setFilesState({ inProgress: true });

    renameGDFile(activeFileModel, newName)
      .then(() => {
        const updatedFile = new File({ ...activeFileModel, name: newName });

        updateFileInTree(updatedFile);
        setActiveFileModel(updatedFile);
        setActiveFileInfo({ fileInfoFromRemoteStorage: updatedFile });
      })
      .catch(e => {
        log.error('Error renaming file', e);
      })
      .finally(() => {
        setFilesState({ inProgress: false });
      });
  }, [activeFileModel, setActiveFileModel, setActiveFileInfo]);

  const userHasDriveAccess = useCallback(() => {
    return currentUser.scopes?.includes('docs');
  }, [currentUser.scopes]);

  // Load files from Google Drive on event (on app loaded and user logged in)
  useEffect(() => {
    document.addEventListener('loadFilesFromGoogleDrive', fetchRootFilesList);

    return () => {
      document.removeEventListener('loadFilesFromGoogleDrive', fetchRootFilesList);
    }
  }, []);

  // On press F2, open rename dialog
  const toggleDrawer = useCallback(() => {
    setDrawerState({ open: !drawerState.open });
  }, [drawerState, setDrawerState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = isCtrl(e);

      if (e.code === 'F2') {
        e.preventDefault();
        renameActiveFile();
      }

      if (ctrl && e.code === 'KeyB') {
        e.preventDefault();
        toggleDrawer();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    }
  }, [drawerState, renameActiveFile]);

  // Move file on drag and drop
  useEffect(() => {
    let movedFileId = '';
    let targetFolderId: string;

    const handleDragStart = (e: DragEvent) => {
      movedFileId = (e.target as HTMLElement).dataset.fileid;
    }

    const handleDragEnd = () => {
      movedFileId = '';
    }

    const handleDragOver = (e: DragEvent) => {
      if (isExternalFilesDrop(e)) {
        e.preventDefault();

        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'copy';
        }
      }
    }

    const handleDrop = async (e: DragEvent) => {
      if (isExternalFilesDrop(e)) {
        e.preventDefault();
      }

      targetFolderId = getListElement(e.target as HTMLElement)?.dataset.fileid;

      // If drop on root area
      if (!targetFolderId) targetFolderId = rootFolderId;

      // Import external files/folders directly into hovered folder
      if (!movedFileId) {
        const transfer = e.dataTransfer;

        if (!transfer || !targetFolderId) return;

        const droppedFiles = await getDroppedFiles(transfer);

        if (!droppedFiles.length) return;

        let targetFolder = getFileFromTreeById(targetFolderId);

        if (targetFolderId !== rootFolderId && targetFolder.mimeType !== MimeTypesEnum.Folder) {
          const closestParentFolder = getClosestParentFolder(fileTree, targetFolder);

          if (closestParentFolder?.id) {
            targetFolderId = closestParentFolder.id;
          }
        }

        uploadFiles(droppedFiles, targetFolderId);
        return;
      }

      // If drop outside of the list
      if (!targetFolderId) return;

      const fileToMove = getFileFromTreeById(movedFileId);
      let targetFolder = getFileFromTreeById(targetFolderId);

      // If the file is not a folder
      if (targetFolderId !== rootFolderId && targetFolder.mimeType !== MimeTypesEnum.Folder) {
        const closestParentFolder = getClosestParentFolder(fileTree, targetFolder);

        if (closestParentFolder) {
          targetFolder = closestParentFolder as File;
          targetFolderId = closestParentFolder.id;
        }
      }

      // If the file is already in the folder
      if (fileToMove.id === targetFolderId || fileToMove.parents.includes(targetFolderId)) return;

      if (window.confirm(`Move "${fileToMove.name}" to "${targetFolder?.name || mainFolderName}"?`)) {
        setFilesState({ inProgress: false });

        changeFileParent(fileToMove, targetFolderId)
          .then(() => {
            const updatedFile = { ...fileToMove, parents: [targetFolderId] };

            updateFileInTree(updatedFile);
          })
          .catch(e => {
            log.error('Error moving file', e);
          })
          .finally(() => {
            setFilesState({ inProgress: false });
          });
      }
    }

    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    }
  }, [activeFileModel, rootFolderId, getFileFromTreeById, uploadFiles, fileTree]);

  ////////////////////////////
  // Open/close drawer
  ////////////////////////////
  const contextMenuCallback = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuEvent(e);
  }, [setContextMenuEvent]);

  const setDrawerElementWidth = useCallback((width: number, open: boolean) => {
    const drawer = drawerRef.current;
    const resizeBar = resizeBarRef.current;

    if (!drawer || !resizeBar) return;

    resizeBar.style.left = open
      ? `${width}px`
      : '0';

    if (drawer) {
      drawer.style.width = `${width}px`;
    }

    if (open) {
      drawer.style.marginLeft = '0';
    } else {
      drawer.style.marginLeft = `-${width}px`;
    }
  }, []);

  // Set drawer width from state
  useEffect(() => {
    setDrawerElementWidth(drawerState.width || defaultWidth, drawerState.open);

    if (!drawerState.width) {
      setDrawerState({ ...drawerState, width: defaultWidth });
    }
  }, [drawerState]);

  // Resize drawer
  useEffect(() => {
    const resizeBar = resizeBarRef.current;
    const drawer = drawerRef.current;
    const open = drawerState.open;

    if (!resizeBar || !drawer) return;

    let isResizing = false;
    let lastX: number;
    let newWidth: number = drawerState.width;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;

      isResizing = true;
      lastX = e.clientX;

      // Prevent text selection during resizing
      document.body.style.userSelect = 'none';
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const delta = e.clientX - lastX;
      newWidth += delta;
      lastX = e.clientX;

      if (newWidth < minWidth) {
        newWidth = minWidth;
      }

      if (newWidth + minWidth > window.innerWidth) {
        newWidth = window.innerWidth - minWidth;
      }

      setDrawerElementWidth(newWidth, open);
    }

    const handleMouseUp = () => {
      isResizing = false;
      document.body.style.userSelect = 'unset';

      if (newWidth !== drawerState.width) {
        setDrawerState({ ...drawerState, width: newWidth });
      }
    }

    resizeBar.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      resizeBar.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
  }, [drawerState, setDrawerState]);

  const renderTitle = () => {
    return (
      <div
        className={`LeftDrawer__title ${moveFileToMode ? 'moveFileMode' : ''}`}>
        <div className='LeftDrawer__titleLeft'>
          {drawerState.mode === LeftDrawerModes.Explorer && <>
            Explorer
          </>}

          {drawerState.mode === LeftDrawerModes.FileMoveTo && <>
            <span className='light-color'>Move</span>
            <div className='elipsis'>
              {drawerState.fileToMove?.name || 'file'}
            </div>
          </>}

          {isExplorerInProgress && <Spinner />}
        </div>

        <div className="LeftDrawer__titleRight">
          {moveFileToMode && <button
            onClick={() => setDrawerState({ mode: LeftDrawerModes.Explorer })}
            className="LeftDrawer__button">
            <Icon size="1.4rem">close</Icon>
          </button>}

          {drawerState.mode === LeftDrawerModes.Explorer && <>
            <button
              title='Refresh files list'
              onClick={() => fetchRootFilesList()}
              className="LeftDrawer__button">
              <Icon size="1.4rem">refresh</Icon>
            </button>

            <button
              title={sessionState.showDropzone ? 'Abort upload' : 'Upload files'}
              onClick={() => openUploadDialog()}
              className="LeftDrawer__button">
              {fileUploadingInProgress
                ? <Spinner size="1.4rem" />
                : <Icon size="1.4rem">{sessionState.showDropzone ? 'close' : 'drive_export'}</Icon>
              }
            </button>
          </>}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={drawerRef}
      className='LeftDrawer'
      onContextMenu={contextMenuCallback}>

      <div
        ref={resizeBarRef}
        className='LeftDrawer__resizeBar'></div>

      <ContextMenu contextEvent={contextMenuEvent} />

      {renderTitle()}

      <div className='LeftDrawer__tree'>
        {fileTree?.map((f) => <ListItem
          key={f.id}
          fileFromList={f} />)
        }

        <div className='LeftDrawer__bottom'>
        </div>
      </div>

      {!userHasDriveAccess() &&
        <button
          title="To see your Google Drive files, you need to accept access to your Google Drive account"
          onClick={requestAdditionalScopes}>
          Request my Google Drive files
        </button>
      }
    </div>
  );
};
