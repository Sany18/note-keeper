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
  const [filesState, setFilesState] = useRecoilState(explorerSelector);
  const [drawerState, setDrawerState] = useRecoilState(leftDrawerSelector);

  const { activeFileInfo, activeFileModel, setActiveFileModel, setActiveFileInfo } = useActiveFile();
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
  const selectedFiles = useMemo(() => {
    if (!fileFromList) return [];

    const selectedFileIds = filesState.selectedFileIds || [];
    const shouldUseSelection = selectedFileIds.includes(fileFromList.id);
    const actionFileIds = shouldUseSelection ? selectedFileIds : [fileFromList.id];

    return actionFileIds
      .map(fileId => findElementInTree(fileTree, fileId))
      .filter(Boolean)
      .filter(file => file.draggable !== false);
  }, [fileFromList, filesState.selectedFileIds, fileTree]);

  const moveFileToMode = drawerState.mode === LeftDrawerModes.FileMoveTo;

  // Means only the new contextEvent call will show context menu
  useEffect(() => {
    toggleMenu(!!fileFromList);
    toggleSubMenu(false);
  }, [contextEvent]);

  const renameSaveHandler = useCallback((newName: string) => {
    setFilesState({ inProgress: true });

    renameGDFile(fileFromList, newName)
      .then(() => {
        const updatedFile = new File({ ...fileFromList, name: newName });

        updateFileInTree(updatedFile);

        if (activeFileModel?.id === updatedFile.id || activeFileInfo?.fileInfoFromRemoteStorage?.id === updatedFile.id) {
          setActiveFileModel(updatedFile);
          setActiveFileInfo({ fileInfoFromRemoteStorage: updatedFile });
        }
      })
      .catch(e => {
        log.error('Error renaming file', e);
      })
      .finally(() => {
        setFilesState({ inProgress: false });
      });
  }, [fileFromList, fileTree, updateFileInTree, activeFileModel, activeFileInfo, setActiveFileModel, setActiveFileInfo]);

  const renameClickHandler = useCallback(() => {
    toggleMenu(false);

    setTimeout(() => {
      if (!selectedFiles.length) return;

      const renameTargets = selectedFiles;
      const multipleFiles = renameTargets.length > 1;

      if (multipleFiles && !window.confirm(`Rename ${renameTargets.length} selected items?`)) {
        return;
      }

      setFilesState({ inProgress: true });

      Promise.all(renameTargets.map((targetFile) => {
        const nextName = window.prompt(
          `Rename "${targetFile.name}" to:`,
          targetFile.name
        );

        if (!nextName || nextName === targetFile.name) return Promise.resolve();

        return renameGDFile(targetFile, nextName)
          .then(() => {
            const updatedFile = new File({ ...targetFile, name: nextName });

            updateFileInTree(updatedFile);

            if (activeFileModel?.id === updatedFile.id || activeFileInfo?.fileInfoFromRemoteStorage?.id === updatedFile.id) {
              setActiveFileModel(updatedFile);
              setActiveFileInfo({ fileInfoFromRemoteStorage: updatedFile });
            }
          });
      }))
        .catch(e => {
          log.error('Error renaming file(s)', e);
        })
        .finally(() => {
          setFilesState({ inProgress: false });
        });
    }, 0);
  }, [selectedFiles, activeFileModel, activeFileInfo]);

  const fileMoveCancel = useCallback(() => {
    setFilesState({ inProgress: false });
    setDrawerState({ mode: LeftDrawerModes.Explorer, fileToMove: null, fileIdsToMove: [] });
  }, [setFilesState, setDrawerState]);

  const moveToClickHandler = useCallback(() => {
    toggleMenu(false);

    setTimeout(() => {
      if (moveFileToMode) {
        // Move file here
        setFilesState({ inProgress: true });

        const closestParentFolder = getClosestParentFolder(fileTree, fileFromList);
        const targetFolderId = closestParentFolder.id;
        const fileIdsToMove = drawerState.fileIdsToMove?.length
          ? drawerState.fileIdsToMove
          : drawerState.fileToMove?.id
            ? [drawerState.fileToMove.id]
            : [];

        const filesToMove = fileIdsToMove
          .map(id => findElementInTree(fileTree, id))
          .filter(Boolean)
          .filter(file => file.id !== targetFolderId && file.parents?.[0] !== targetFolderId);

        if (!filesToMove.length) return fileMoveCancel();

        const moveMessage = filesToMove.length > 1
          ? `Move ${filesToMove.length} selected items to "${closestParentFolder.name}"?`
          : `Move "${filesToMove[0].name}" to "${closestParentFolder.name}"?`;

        if (!window.confirm(moveMessage)) return fileMoveCancel();

        Promise.all(filesToMove.map(fileToMove =>
          changeFileParent(fileToMove, targetFolderId)
            .then(() => {
              const updatedFile = new File({ ...fileToMove, parents: [targetFolderId] });
              updateFileInTree(updatedFile);
            })
        ))
          .catch(e => log.error('Error moving file(s)', e))
          .finally(fileMoveCancel);
      } else {
        const fileIdsToMove = selectedFiles.length > 1
          ? selectedFiles.map(file => file.id)
          : [fileFromList.id];

        setDrawerState({
          mode: LeftDrawerModes.FileMoveTo,
          fileToMove: fileFromList,
          fileIdsToMove,
        });
      }
    }, 0);
  }, [fileFromList, fileTree, setDrawerState, changeFileParent, updateFileInTree, fileMoveCancel, drawerState.fileToMove, drawerState.fileIdsToMove, selectedFiles]);

  const delefeFile = useCallback(() => {
    toggleMenu(false);

    setTimeout(() => {
      if (!selectedFiles.length) return;

      const deleteMessage = selectedFiles.length > 1
        ? `Are you sure you want to delete ${selectedFiles.length} selected items?`
        : `Are you sure you want to delete "${selectedFiles[0].name}"?`;

      if (!window.confirm(deleteMessage)) {
        return;
      }

      setFilesState({ inProgress: true });

      Promise.all(selectedFiles.map(file => deleteGDFile(file)))
        .then(() => {
          let nextTree = fileTree;

          selectedFiles.forEach(file => {
            nextTree = removeElementFromTree(nextTree, file.id);
          });

          setTree(nextTree);

          const deletedFileIds = selectedFiles.map(file => file.id);

          if (deletedFileIds.includes(activeFileInfo?.fileInfoFromRemoteStorage?.id) || deletedFileIds.includes(activeFileModel?.id)) {
            resetCurrentFileInfo();
            resetCurrentFileContent();
            setFilesState({ activeFileModel: null });
          }

          setFilesState({ selectedFileIds: [], lastSelectedFileId: null });
        })
        .catch(e => {
          log.error('Error deleting file(s)', e);
        })
        .finally(() => {
          setFilesState({ inProgress: false });
        });
    }, 0);
  }, [fileTree, activeFileInfo, activeFileModel, fileFromList, setFilesState, selectedFiles]);

  const onUploadFilesToFolder = useCallback(() => {
    toggleMenu(false);

    if (fileFromList) {
      const newThree = updateTreeElement(fileTree, fileFromList.id, { folderOpen: true });
      setTree(newThree);
    }

    openUploadDialog(fileFromList?.id || rootId);
  }, [rootId, closestParentFolder, fileTree, fileFromList, setFilesState]);

  const createNewItem = useCallback((
    itemType: 'file' | 'folder',
    mimeType?: string,
    itemTypeLabel = itemType === 'folder' ? 'folder' : 'file'
  ) => {
    toggleMenu(false);
    toggleSubMenu(false);

    setTimeout(() => {
      const parentFolderName = closestParentFolder ? closestParentFolder.name : mainFolderName;
      const itemName = window.prompt(`Create a ${itemTypeLabel} in "${parentFolderName}"\nEnter ${itemTypeLabel} name`);

      if (!itemName) return;

      setFilesState({ inProgress: true });

      const finalMimeType = itemType === 'folder'
        ? MimeTypesEnum.Folder
        : mimeType || getMimeFromExtension(fileFromList?.extension || '') || MimeTypesEnum.Text;

      const targetParentId = closestParentFolder?.id || fileFromList?.parents?.[0] || rootId;
      const parentIds = [targetParentId];

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

  const createNewTextFile = useCallback(() => createNewItem('file', MimeTypesEnum.Text, 'note'), [createNewItem]);

  const createNewFolder = useCallback(() => createNewItem('folder', MimeTypesEnum.Folder), [createNewItem]);

  const createGoogleDoc = useCallback(() => createNewItem('file', MimeTypesEnum.Document, 'Google document'), [createNewItem]);

  const createGoogleSheet = useCallback(() => createNewItem('file', MimeTypesEnum.Spreadsheet, 'Google spreadsheet'), [createNewItem]);

  const createGoogleSlides = useCallback(() => createNewItem('file', MimeTypesEnum.Presentation, 'Google presentation'), [createNewItem]);

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

  const openCreateMenuSubmenu = useCallback((event: any) => {
    event.stopPropagation();

    if (subMenuRef.current) {
      const triggerRect = event.currentTarget.getBoundingClientRect();

      subMenuRef.current.style.left = `${triggerRect.right + 4}px`;
      subMenuRef.current.style.top = `${triggerRect.top}px`;
    }

    toggleSubMenu(true);
  }, [toggleSubMenu]);

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
      </div>
    </div>

    <div
      ref={subMenuRef}
      className={`ContextMenu ContextMenu__submenu_createMore contextMenu ${subMenuOpen ? '' : 'hide'}`}>
      <div
        onClick={createGoogleDoc}
        className="ContextMenu__item item">
        Google Docs
        <Icon>description</Icon>
      </div>

      <div
        onClick={createGoogleSheet}
        className="ContextMenu__item item">
        Google Sheets
        <Icon>table_chart</Icon>
      </div>

      <div
        onClick={createGoogleSlides}
        className="ContextMenu__item item">
        Google Slides
        <Icon>slideshow</Icon>
      </div>
    </div>
  </>);
});
