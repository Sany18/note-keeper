import { useGapi } from 'reactHooks/gapi/useGapi.hook';
import { useExplorer } from 'reactHooks/fileManager/explorer/explorer.hook';
import { useGoogleAuth } from 'reactHooks/gis/googleAuth.hook';
import { useActiveFile } from 'reactHooks/fileManager/activeFile/activeFile.hook';
import { useUploadFiles } from 'reactHooks/gapi/useUploadFiles.hook';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useRecoilState } from 'recoil';

import { log } from 'services/log/log.service';
import { useHotkey } from 'services/keyboardEvents/useHotkey';
import { useHotkeyZone } from 'services/keyboardEvents/useHotkeyZone';
import { useFileViewerService } from 'services/FileViewer/fileViewer.service';
import { appEvents } from 'state/events';
import { isTouchDevice } from 'services/clientDevice/getPlatform';
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
  const [filesState, setFilesState] = useRecoilState(explorerSelector);
  const [drawerState, setDrawerState] = useRecoilState(leftDrawerSelector);

  const { activeFileInfo, activeFileModel, setActiveFileModel, setActiveFileInfo } = useActiveFile();
  const { isExplorerInProgress, fileTree, rootFolderId, updateFileInTree, getFileFromTreeById, toggleFolderInTree } = useExplorer();

  const { renameGDFile, changeFileParent, fetchRootFilesList, fetchChildrenList } = useGapi();
  const { requestAdditionalScopes, currentUser } = useGoogleAuth();
  const { inProgress: fileUploadingInProgress, openUploadDialog, uploadFiles } = useUploadFiles();
  const { loadFileFromRS } = useFileViewerService();

  const [contextMenuEvent, setContextMenuEvent] = useState<any>(false);

  const drawerRef = useRef<HTMLDivElement>(null);
  const resizeBarRef = useRef<HTMLDivElement>(null);

  const minWidth = 120; // px
  const defaultWidth = Math.min(300, window.innerWidth - minWidth);

  const moveFileToMode = drawerState.mode === LeftDrawerModes.FileMoveTo;
  const selectedFilesCount = filesState.selectedFileIds?.length || 0;

  ////////////////////////////
  // Buisness logic
  ////////////////////////////
  const getListElement = useCallback((element: HTMLElement) => {
    return getDOMParrentElement(element, 'ListItem');
  }, []);

  const getVisibleFileIds = useCallback(() => {
    return Array.from(document.querySelectorAll('.LeftDrawer__tree .ListItem[data-fileid]'))
      .map((el: Element) => (el as HTMLElement).dataset.fileid)
      .filter(Boolean) as string[];
  }, []);

  const clearSelection = useCallback(() => {
    setFilesState({
      selectedFileIds: [],
      lastSelectedFileId: null,
      selectionAnchorFileId: null,
    });
  }, [setFilesState]);

  const handleListItemClick = useCallback((clickedFile: File, e: React.MouseEvent) => {
    const clickedId = clickedFile.id;
    const currentSelection = filesState.selectedFileIds || [];

    if (e.shiftKey && (filesState.selectionAnchorFileId || filesState.lastSelectedFileId)) {
      const visibleFileIds = getVisibleFileIds();
      const anchorId = filesState.selectionAnchorFileId || filesState.lastSelectedFileId;
      const startIndex = visibleFileIds.indexOf(anchorId);
      const endIndex = visibleFileIds.indexOf(clickedId);

      if (startIndex >= 0 && endIndex >= 0) {
        const [from, to] = startIndex < endIndex
          ? [startIndex, endIndex]
          : [endIndex, startIndex];

        const rangeSelection = visibleFileIds.slice(from, to + 1);

        setFilesState({
          selectedFileIds: rangeSelection,
          lastSelectedFileId: clickedId,
          selectionAnchorFileId: anchorId,
        });
      } else {
        setFilesState({
          selectedFileIds: [clickedId],
          lastSelectedFileId: clickedId,
          selectionAnchorFileId: clickedId,
        });
      }

      return false;
    }

    if (e.metaKey || e.ctrlKey) {
      const nextSelection = currentSelection.includes(clickedId)
        ? currentSelection.filter(id => id !== clickedId)
        : [...currentSelection, clickedId];

      setFilesState({
        selectedFileIds: nextSelection,
        lastSelectedFileId: clickedId,
        selectionAnchorFileId: clickedId,
      });

      return false;
    }

    setFilesState({
      selectedFileIds: [clickedId],
      lastSelectedFileId: clickedId,
      selectionAnchorFileId: clickedId,
    });

    return true;
  }, [filesState.selectedFileIds, filesState.lastSelectedFileId, filesState.selectionAnchorFileId, getVisibleFileIds]);

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


  const toggleDrawer = useCallback(() => {
    setDrawerState({ open: !drawerState.open });
  }, [drawerState, setDrawerState]);

  const explorerZone = useHotkeyZone('explorer');

  useHotkey('explorer', 'F2', (e) => { e.preventDefault(); renameActiveFile(); }, 'Rename file');
  useHotkey('global', 'ctrl+KeyB', (e) => { e.preventDefault(); toggleDrawer(); }, 'Toggle sidebar');
  useHotkey('explorer', 'Escape', (e) => { if (selectedFilesCount > 0) { e.preventDefault(); clearSelection(); } }, 'Clear selection');
  useHotkey('explorer', 'shift+ArrowDown', (e) => {
    const visibleFileIds = getVisibleFileIds();
    if (!visibleFileIds.length) return;

    const currentId = filesState.lastSelectedFileId
      || filesState.selectedFileIds?.[filesState.selectedFileIds.length - 1]
      || filesState.selectionAnchorFileId
      || visibleFileIds[0];
    const anchorId = filesState.selectionAnchorFileId || currentId;

    const currentIndex = visibleFileIds.indexOf(currentId);
    const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = Math.min(safeCurrentIndex + 1, visibleFileIds.length - 1);
    const nextId = visibleFileIds[nextIndex];

    if (!nextId) return;
    e.preventDefault();

    const anchorIndex = visibleFileIds.indexOf(anchorId);
    const safeAnchorIndex = anchorIndex >= 0 ? anchorIndex : safeCurrentIndex;
    const [from, to] = safeAnchorIndex < nextIndex
      ? [safeAnchorIndex, nextIndex]
      : [nextIndex, safeAnchorIndex];

    setFilesState({ selectedFileIds: visibleFileIds.slice(from, to + 1), lastSelectedFileId: nextId, selectionAnchorFileId: visibleFileIds[safeAnchorIndex] });
  }, 'Extend selection down');
  useHotkey('explorer', 'shift+ArrowUp', (e) => {
    const visibleFileIds = getVisibleFileIds();
    if (!visibleFileIds.length) return;

    const currentId = filesState.lastSelectedFileId
      || filesState.selectedFileIds?.[filesState.selectedFileIds.length - 1]
      || filesState.selectionAnchorFileId
      || visibleFileIds[0];
    const anchorId = filesState.selectionAnchorFileId || currentId;

    const currentIndex = visibleFileIds.indexOf(currentId);
    const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = Math.max(safeCurrentIndex - 1, 0);
    const nextId = visibleFileIds[nextIndex];

    if (!nextId) return;
    e.preventDefault();

    const anchorIndex = visibleFileIds.indexOf(anchorId);
    const safeAnchorIndex = anchorIndex >= 0 ? anchorIndex : safeCurrentIndex;
    const [from, to] = safeAnchorIndex < nextIndex
      ? [safeAnchorIndex, nextIndex]
      : [nextIndex, safeAnchorIndex];

    setFilesState({ selectedFileIds: visibleFileIds.slice(from, to + 1), lastSelectedFileId: nextId, selectionAnchorFileId: visibleFileIds[safeAnchorIndex] });
  }, 'Extend selection up');

  const selectSingleFile = useCallback((id: string) => {
    setFilesState({ selectedFileIds: [id], lastSelectedFileId: id, selectionAnchorFileId: id });
    document.querySelector(`.LeftDrawer .ListItem[data-fileid="${id}"] .ListItem__content`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [setFilesState]);

  useHotkey('explorer', 'ArrowDown', (e) => {
    e.preventDefault();
    const ids = getVisibleFileIds();
    if (!ids.length) return;
    const cur = filesState.lastSelectedFileId || filesState.selectedFileIds?.[0] || activeFileInfo?.fileInfoFromRemoteStorage?.id;
    const idx = cur ? ids.indexOf(cur) : -1;
    selectSingleFile(ids[Math.min(idx + 1, ids.length - 1)]);
  }, 'Navigate down');

  useHotkey('explorer', 'ArrowUp', (e) => {
    e.preventDefault();
    const ids = getVisibleFileIds();
    if (!ids.length) return;
    const cur = filesState.lastSelectedFileId || filesState.selectedFileIds?.[0] || activeFileInfo?.fileInfoFromRemoteStorage?.id;
    const idx = cur ? ids.indexOf(cur) : ids.length;
    selectSingleFile(ids[Math.max(idx - 1, 0)]);
  }, 'Navigate up');

  useHotkey('explorer', 'ArrowRight', (e) => {
    e.preventDefault();
    const cur = filesState.lastSelectedFileId || filesState.selectedFileIds?.[0] || activeFileInfo?.fileInfoFromRemoteStorage?.id;
    if (!cur) return;
    const file = getFileFromTreeById(cur);
    if (!file?.isFolder) return;
    if (!file.folderOpen) {
      toggleFolderInTree(file, true);
      fetchChildrenList(file);
    } else {
      const ids = getVisibleFileIds();
      const idx = ids.indexOf(cur);
      if (idx >= 0 && idx < ids.length - 1) selectSingleFile(ids[idx + 1]);
    }
  }, 'Expand folder');

  useHotkey('explorer', 'ArrowLeft', (e) => {
    e.preventDefault();
    const cur = filesState.lastSelectedFileId || filesState.selectedFileIds?.[0] || activeFileInfo?.fileInfoFromRemoteStorage?.id;
    if (!cur) return;
    const file = getFileFromTreeById(cur);
    if (!file) return;
    if (file.isFolder && file.folderOpen) {
      toggleFolderInTree(file, false);
    } else {
      const parent = getFileFromTreeById(file.parents?.[0]);
      if (parent) selectSingleFile(parent.id);
    }
  }, 'Collapse folder / go to parent');

  useHotkey('explorer', 'Enter', (e) => {
    e.preventDefault();
    const cur = filesState.lastSelectedFileId || filesState.selectedFileIds?.[0];
    if (!cur) return;
    const file = getFileFromTreeById(cur);
    if (!file) return;
    if (file.isFolder) {
      const opening = !file.folderOpen;
      toggleFolderInTree(file, opening);
      if (opening) fetchChildrenList(file);
    } else {
      if (!activeFileInfo?.isFileSavedToRemoteStorage) appEvents.onSaveToGoogleDrive.emit();
      loadFileFromRS(file);
      setActiveFileModel(file);
    }
  }, 'Open file / toggle folder');

  // Move file on drag and drop
  useEffect(() => {
    if (isTouchDevice) {
      return;
    }

    let movedFileId = '';
    let targetFolderId: string;

    const handleDragStart = (e: DragEvent) => {
      movedFileId = getListElement(e.target as HTMLElement)?.dataset.fileid || '';
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

        return;
      }

      if (movedFileId) {
        e.preventDefault();

        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'move';
        }
      }
    }

    const handleDrop = async (e: DragEvent) => {
      if (isExternalFilesDrop(e) || movedFileId) {
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
      const selectedFileIds = filesState.selectedFileIds || [];
      const movedFileIds = selectedFileIds.includes(movedFileId)
        ? selectedFileIds
        : [movedFileId];
      let targetFolder = getFileFromTreeById(targetFolderId);

      // If the file is not a folder
      if (targetFolderId !== rootFolderId && targetFolder.mimeType !== MimeTypesEnum.Folder) {
        const closestParentFolder = getClosestParentFolder(fileTree, targetFolder);

        if (closestParentFolder) {
          targetFolder = closestParentFolder as File;
          targetFolderId = closestParentFolder.id;
        }
      }

      const filesToMove = movedFileIds
        .map(id => getFileFromTreeById(id))
        .filter(Boolean)
        .filter(file => file.id !== targetFolderId && !file.parents.includes(targetFolderId));

      if (!filesToMove.length) return;

      const targetFolderName = targetFolder?.name || mainFolderName;
      const moveMessage = filesToMove.length > 1
        ? `Move ${filesToMove.length} selected items to "${targetFolderName}"?`
        : `Move "${filesToMove[0].name}" to "${targetFolderName}"?`;

      if (window.confirm(moveMessage)) {
        setFilesState({ inProgress: true });

        Promise.all(filesToMove.map(file =>
          changeFileParent(file, targetFolderId)
            .then(() => updateFileInTree({ ...file, parents: [targetFolderId] }))
        ))
          .catch(e => {
            log.error('Error moving file(s)', e);
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
  }, [activeFileModel, rootFolderId, getFileFromTreeById, uploadFiles, fileTree, filesState.selectedFileIds]);

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
            {selectedFilesCount > 0 && ` (${selectedFilesCount} selected)`}
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
              disabled={isExplorerInProgress}
              className="LeftDrawer__button">
              <Icon size="1.4rem">refresh</Icon>
            </button>

            <button
              title={sessionState.showDropzone ? 'Abort upload' : 'Upload files'}
              onClick={() => openUploadDialog()}
              className="LeftDrawer__button">
              {fileUploadingInProgress
                ? <Spinner size="1.4rem" />
                : <Icon size="1.4rem">{sessionState.showDropzone ? 'close' : 'cloud_upload'}</Icon>
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
      className={`LeftDrawer${explorerZone.isActive ? ' zone--active' : ''}`}
      onContextMenu={contextMenuCallback}
      onClick={explorerZone.activate}>

      <div
        ref={resizeBarRef}
        className='LeftDrawer__resizeBar'></div>

      <ContextMenu contextEvent={contextMenuEvent} />

      {renderTitle()}

      <div className='LeftDrawer__tree'>
        {fileTree?.map((f) => <ListItem
          key={f.id}
          fileFromList={f}
          selectedFileIds={filesState.selectedFileIds}
          onListItemClick={handleListItemClick} />)
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
