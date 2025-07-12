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
import { MyDevices } from './MyDevices/MyDevices';
import { ContextMenu } from './ContextMenu/ContextMenu';
import { MimeTypesEnum } from 'const/mimeTypes/mimeTypes.const';
import { mainFolderName } from 'const/remoteStorageProviders/googleDrive/mainFolderName';
import { LeftDrawerModes } from 'const/leftDrawerModes';

import './Explorer.css';

type Props = {};

export const Explorer: React.FC<Props> = () => {
  const [appState] = useRecoilState(appSelector);
  const [sessionState] = useRecoilState(sessionSelector);
  const [, setFilesState] = useRecoilState(explorerSelector);
  const [drawerState, setDrawerState] = useRecoilState(leftDrawerSelector);

  const { activeFileModel } = useActiveFile();
  const { isExplorerInProgress, fileTree, rootFolderId, updateFileInTree, getFileFromTreeById } = useExplorer();

  const { renameGDFile, changeFileParent, fetchRootFilesList } = useGapi();
  const { requestAdditionalScopes, currentUser } = useGoogleAuth();
  const { inProgress: fileUploadingInProgress, openUploadDialog } = useUploadFiles();

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
        const updatedFile = { ...activeFileModel, name: newName };

        updateFileInTree(updatedFile);
      })
      .catch(e => {
        log.error('Error renaming file', e);
      })
      .finally(() => {
        setFilesState({ inProgress: false });
      });
  }, [activeFileModel]);

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
    let movedFileId: string;
    let targetFolderId: string;

    const handleDragStart = (e: DragEvent) => {
      movedFileId = (e.target as HTMLElement).dataset.fileid;
    }

    const handleDragOver = (e: DragEvent) => {}

    const handleDrop = (e: DragEvent) => {
      targetFolderId = getListElement(e.target as HTMLElement)?.dataset.fileid;

      // If drop on root folder
      if (movedFileId && !targetFolderId) targetFolderId = rootFolderId;

      // If drop outside of the list
      if (!movedFileId || !targetFolderId) return;

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
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    }
  }, [activeFileModel, rootFolderId, getFileFromTreeById]);

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

  // Open/close/resize drawer on swipe (touch)
  useEffect(() => {
    const currentSidebarWidth = drawerState.width;
    const nextDrawerState = { ...drawerState };
    const defineDirectionTreshold = 10;

    let newWidth: number;
    let touchStart = { x: 0, y: 0 };
    let allowResize = false;
    let directionDefined: 'x' | 'y' | false = false;

    const handleTouchStart = (e: TouchEvent) => {
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      if (!drawerState.open && touchStart.x < 20) {
        allowResize = true;
      } else if (touchStart.x < currentSidebarWidth + 10) {
        allowResize = true;
      } else {
        allowResize = false;
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!allowResize || directionDefined === 'y') return;

      const { clientX, clientY } = e.touches[0];

      // To avoid scrolling and moving the drawer at the same time
      if (!directionDefined
          && (Math.abs(touchStart.y - clientY) > defineDirectionTreshold
            || Math.abs(touchStart.x - clientX) > defineDirectionTreshold)) {
        if (Math.abs(touchStart.y - clientY) > defineDirectionTreshold) {
          allowResize = false;
          directionDefined = 'y';
          return;
        } else {
          directionDefined = 'x';
        }
      }

      e.preventDefault();

      const touchDelta = clientX - touchStart.x;
      newWidth = currentSidebarWidth + touchDelta;

      if (newWidth + minWidth > window.innerWidth) {
        newWidth = window.innerWidth - minWidth;
      }

      setDrawerElementWidth(newWidth, true);

      if (newWidth < minWidth) {
        nextDrawerState.open = false;
      }

      if (newWidth > minWidth) {
        nextDrawerState.open = true;
      }
    }

    const handleTouchEnd = () => {
      directionDefined = false;

      if (!allowResize || !newWidth || newWidth === currentSidebarWidth) return;

      if (newWidth < 1) {
        newWidth = 1;
      }

      setDrawerState({ ...nextDrawerState, width: newWidth });
    }

    document.addEventListener('touchstart', handleTouchStart, false);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, false);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart, false);
      document.removeEventListener('touchmove', handleTouchMove, false);
      document.removeEventListener('touchend', handleTouchEnd, false);
    }
  }, [drawerState]);

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

        <MyDevices />

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
