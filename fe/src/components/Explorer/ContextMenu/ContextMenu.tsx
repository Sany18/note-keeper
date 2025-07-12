import { useGapi } from 'reactHooks/gapi/useGapi.hook';
import { useExplorer } from 'reactHooks/fileManager/explorer/explorer.hook';
import { useActiveFile } from 'reactHooks/fileManager/activeFile/activeFile.hook';
import { useContextMenu } from 'reactHooks/contextMenu/contextMenu.hook';
import { useUploadFiles } from 'reactHooks/gapi/useUploadFiles.hook';
import { FC, memo, useCallback, useEffect, useMemo, useRef } from 'react';

import { useRecoilState, useResetRecoilState } from 'recoil';

import { log } from 'services/log/log.service';
import { getMimeFromExtension } from 'services/fileTypeConverter/getMimeFromExtension';
import { getDOMParrentElement } from 'services/DOM/getParentElementByClassName';
import { appendChildToFolder, findElementInTree, getClosestParentFolder, removeElementFromTree, updateTreeElement } from 'services/tree/treeHelpers';

import { explorerSelector } from 'state/localState/explorerState';
import { activeFileInfoSelector } from 'state/localState/activeFile/activeFileInfoState';
import { leftDrawerSelector } from 'state/localState/leftDrawerState';

import { Icon } from 'components/Atoms/Icon/Icon';
import { File } from 'dtos/file.model';
import { MimeTypesEnum } from 'const/mimeTypes/mimeTypes.const';
import { mainFolderName } from 'const/remoteStorageProviders/googleDrive/mainFolderName';
import { LeftDrawerModes } from 'const/leftDrawerModes';

import './ContextMenu.css';
import { activeFileContentSelector } from 'state/localState/activeFile/activeFileContentState';

type Props = {
  contextEvent: any;
}

export const ContextMenu: FC<Props> = memo(({ contextEvent }) => {
  const resetCurrentFileInfo = useResetRecoilState(activeFileInfoSelector);
  const resetCurrentFileContent = useResetRecoilState(activeFileContentSelector);
  const [, setFilesState] = useRecoilState(explorerSelector);
  const [drawerState, setDrawerState] = useRecoilState(leftDrawerSelector);

  const { activeFileInfo } = useActiveFile();
  const { fileTree, setTree, updateFileInTree } = useExplorer();

  const { openUploadDialog } = useUploadFiles();
  const { deleteGDFile, renameGDFile, createFile, rootId, changeFileParent } = useGapi();

  const contextMenuRef = useRef(null);
  const subMenuRef = useRef(null);
  const { menuOpen, toggleMenu } = useContextMenu(contextMenuRef);
  const { menuOpen: subMenuOpen, toggleMenu: toggleSubMenu } = useContextMenu(subMenuRef);

  const getListElement = useCallback((element: HTMLElement) => {
    return getDOMParrentElement(element, 'ListItem');
  }, []);

  const currentListItemEl = useMemo(() => getListElement(contextEvent?.target), [contextEvent.target]);
  const fileFromList = useMemo(() => {
    const elementId = currentListItemEl?.dataset?.fileid;

    if (!elementId) return;

    return findElementInTree(fileTree, elementId);
  }, [fileTree, currentListItemEl]);

  const closestParentFolder = useMemo(() => getClosestParentFolder(fileTree, fileFromList), [fileTree, fileFromList]);
  const isNotDraggableElement = useMemo(() => fileFromList?.draggable === false, [currentListItemEl]);

  const moveFileToMode = drawerState.mode === LeftDrawerModes.FileMoveTo;

  // Means only the new contextEvent call will show context menu
  useEffect(() => {
    toggleMenu(!!fileFromList);
  }, [contextEvent]);

  const renameSaveHandler = useCallback((newName: string) => {
    setFilesState({ inProgress: true });

    renameGDFile(fileFromList, newName)
      .then(() => {
        const updatedFile = { ...fileFromList, name: newName };

        updateFileInTree(updatedFile);
      })
      .catch(e => {
        log.error('Error renaming file', e);
      })
      .finally(() => {
        setFilesState({ inProgress: false });
      });
  }, [fileFromList, fileTree, updateFileInTree]);

  const renameClickHandler = useCallback(() => {
    toggleMenu(false);

    setTimeout(() => {
      const newName = window.prompt(
        `Rename "${fileFromList.name}" to:`,
        fileFromList.name
      );

      if (newName) renameSaveHandler(newName);
    }, 0);
  }, [fileFromList]);

  const fileMoveCancel = useCallback(() => {
    setFilesState({ inProgress: false });
    setDrawerState({ mode: LeftDrawerModes.Explorer, fileToMove: null });
  }, [setFilesState, setDrawerState]);

  const moveToClickHandler = useCallback(() => {
    toggleMenu(false);

    setTimeout(() => {
      if (moveFileToMode) {
        // Move file here
        setFilesState({ inProgress: true });

        const fileToMove = drawerState.fileToMove;
        const closestParentFolder = getClosestParentFolder(fileTree, fileFromList);
        const updatedFile = new File({ ...fileToMove, parents: [closestParentFolder.id] });

        // If file is already in the folder
        if (closestParentFolder.id === fileToMove.parents[0]) return fileMoveCancel();

        // If user cancels the move
        if (!window.confirm(`Move "${fileToMove.name}" to "${closestParentFolder.name}"?`)) return fileMoveCancel();

        changeFileParent(fileToMove, closestParentFolder.id)
          .then(() => updateFileInTree(updatedFile))
          .catch(e => log.error('Error moving file', e))
          .finally(fileMoveCancel);
      } else {
        setDrawerState({
          mode: LeftDrawerModes.FileMoveTo,
          fileToMove: fileFromList
        });
      }
    }, 0);
  }, [fileFromList, fileTree, setDrawerState, changeFileParent, updateFileInTree, fileMoveCancel]);

  const delefeFile = useCallback(() => {
    toggleMenu(false);

    setTimeout(() => {
      if (!window.confirm(`Are you sure you want to delete "${fileFromList.name}"?`)) {
        return;
      }

      setFilesState({ inProgress: true });

      deleteGDFile(fileFromList)
        .then(() => {
          setTree(removeElementFromTree(fileTree, fileFromList.id));

          if (fileFromList.id === activeFileInfo?.fileInfoFromRemoteStorage?.id) {
            resetCurrentFileInfo();
            resetCurrentFileContent();
            setFilesState({ activeFileModel: null });
          }
        })
        .catch(e => {
          log.error('Error deleting file', e);
        })
        .finally(() => {
          setFilesState({ inProgress: false });
        });
    }, 0);
  }, [fileTree, activeFileInfo, fileFromList, setFilesState]);

  const onUploadFilesToFolder = useCallback(() => {
    toggleMenu(false);

    if (fileFromList) {
      const newThree = updateTreeElement(fileTree, fileFromList.id, { folderOpen: true });
      setTree(newThree);
    }

    openUploadDialog(fileFromList?.id || rootId);
  }, [rootId, closestParentFolder, fileTree, fileFromList, setFilesState]);

  const createNewItem = useCallback((itemType, mimeType) => {
    toggleMenu(false);

    setTimeout(() => {
      const itemTypeLabel = itemType === 'folder' ? 'folder' : 'file';
      const parentFolderName = closestParentFolder ? closestParentFolder.name : mainFolderName;
      const itemName = window.prompt(`Create a ${itemTypeLabel} in "${parentFolderName}"\nEnter ${itemTypeLabel} name`);

      if (!itemName) return;

      setFilesState({ inProgress: true });

      const finalMimeType = itemType === 'folder'
        ? MimeTypesEnum.Folder
        : getMimeFromExtension(fileFromList?.extension);

      const parentIds = closestParentFolder
        ? [closestParentFolder.id]
        : fileFromList?.parents || [rootId];

      createFile(itemName, finalMimeType, parentIds)
        .then((response) => {
          const newFile = new File(response.result);
          const newTree = appendChildToFolder<File>(fileTree, parentIds[0], newFile, true);

          setTree(newTree);
        })
        .catch((error) => {
          log.error(`Error creating ${itemTypeLabel}`, error);
        })
        .finally(() => {
          setFilesState({ inProgress: false });
        });
    }, 0);
  }, [closestParentFolder, fileFromList, fileTree, setFilesState]);

  const createNewTextFile = useCallback(() => createNewItem('file', MimeTypesEnum.Text), [createNewItem]);

  const createNewFolder = useCallback(() => createNewItem('folder', MimeTypesEnum.Folder), [createNewItem]);

  const createGoogleDoc = useCallback(() => createNewItem('file', MimeTypesEnum.Document), [createNewItem]);

  // Show context menu
  useEffect(() => {
    if (contextMenuRef.current && contextEvent) {
      const e = contextEvent;
      const elementHeight = contextMenuRef.current.clientHeight;

      contextMenuRef.current.focus();
      contextMenuRef.current.style.left = `${e.clientX}px`;

      if (e.clientY + elementHeight > window.innerHeight) {
        contextMenuRef.current.style.top = `${e.clientY - elementHeight}px`;
      } else {
        contextMenuRef.current.style.top = `${e.clientY}px`;
      }
    }
  }, [contextEvent, fileFromList, contextMenuRef]);

  const openCreateMenuSubmenu = useCallback(() => {
    toggleSubMenu(!subMenuOpen);
  }, []);

  return (<>
    <div
      ref={contextMenuRef}
      className={`ContextMenu contextMenu ${menuOpen ? '' : 'hide'}`}>

      {fileFromList && !isNotDraggableElement &&
        <>
          <div
            title="Rename (F2)"
            onClick={renameClickHandler}
            className="ContextMenu__item item">
            Rename
            <Icon>edit</Icon>
          </div>

          {!moveFileToMode && <div
            onClick={moveToClickHandler}
            className="ContextMenu__item item">
            Move to...
            <Icon>content_cut</Icon>
          </div>}

          <div
            onClick={delefeFile}
            className="ContextMenu__item item">
            Delete
            <Icon>delete</Icon>
          </div>

          <div className='ContextMenu__divider-horizontal'></div>
        </>
      }

      {moveFileToMode && <>
        <div
          onClick={moveToClickHandler}
          className="ContextMenu__item item green">
          Move file here
          <Icon>content_paste</Icon>
        </div>

        <div
          onClick={fileMoveCancel}
          className="ContextMenu__item item">
          Cancel file moving
          <Icon>close</Icon>
        </div>

        <div className='ContextMenu__divider-horizontal'></div>
      </>}

      <div
        onClick={onUploadFilesToFolder}
        className="ContextMenu__item item">
        Upload files
        {` to ${fileFromList?.isFolder
            ? fileFromList?.name
            : closestParentFolder
              ? closestParentFolder.name
              : mainFolderName
        }`}
        <Icon>cloud_upload</Icon>
      </div>

      <div
        onClick={createNewTextFile}
        className="ContextMenu__item item">
        Create a note
        <Icon>add</Icon>
      </div>

      <div
        onClick={createNewFolder}
        className="ContextMenu__item item">
        Create folder
        <Icon>create_new_folder</Icon>
      </div>

      <div
        onClick={openCreateMenuSubmenu}
        className="ContextMenu__item item">
        Create more...
        <Icon>more_horiz</Icon>

        <div
          ref={subMenuRef}
          className={`ContextMenu contextMenu ${subMenuOpen ? '' : 'hide'}`}>
          <div
            onClick={createGoogleDoc}
            className="ContextMenu__item item">
            Document
            <Icon>description</Icon>
          </div>
        </div>
      </div>
    </div>
  </>);
});
