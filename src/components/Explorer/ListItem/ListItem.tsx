import { useGapi } from "reactHooks/gapi/useGapi.hook";
import { useExplorer } from "reactHooks/fileManager/explorer/explorer.hook";
import { useActiveFile } from "reactHooks/fileManager/activeFile/activeFile.hook";
import { useCallback, useState } from "react";

import { isTouchDevice } from "services/clientDevice/getPlatform";
import { useFileViewerService } from "services/FileViewer/fileViewer.service";

import { Img } from "components/Atoms/Img/Img";
import { Icon } from "components/Atoms/Icon/Icon";
import { File } from "dtos/file.model";
import { Spinner } from "components/Spinner/Spinner";
import { appEvents } from "state/events";
import { MimeTypesEnum } from "const/mimeTypes/mimeTypes.const";

import "../ExplorerListItem.css";

type Props = {
  fileFromList: File;
};

export const ListItem: React.FC<Props> = ({ fileFromList }) => {
  const [isDragover, setIsDragover] = useState(false);

  const { fetchChildrenList } = useGapi();
  const { fileTree, toggleFolderInTree } = useExplorer();
  const { setActiveFileModel, activeFileInfo } = useActiveFile();

  const { loadFileFromRS, inProgress, setInProgress } = useFileViewerService();

  const toggleItem = useCallback(() => {
    if (!activeFileInfo?.isFileSavedToRemoteStorage) {
      appEvents.onSaveToGoogleDrive.emit();
    }

    if (fileFromList.isFolder) {
      const isFolderOpen = toggleFolderInTree(fileFromList);

      if (isFolderOpen) {
        setInProgress(true);

        fetchChildrenList(fileFromList)
          .finally(() => setInProgress(false));
      }
    } else {
      loadFileFromRS(fileFromList);
      setActiveFileModel(fileFromList);
    }
  }, [fileTree, fileFromList.mimeType, fileFromList.folderOpen, fetchChildrenList, loadFileFromRS]);

  return (
    <div
      className="ListItem"
      title={fileFromList.title || fileFromList.name}
      draggable={!isTouchDevice || fileFromList.draggable}
      data-fileid={fileFromList.id}>
      <div
        onClick={toggleItem}
        onDrop={() => setIsDragover(false)}
        onDragOver={() => setIsDragover(true)}
        onDragLeave={() => setIsDragover(false)}
        className={`
          ListItem__content
          ${isDragover ? 'dragover' : ''}
          ${fileFromList.folderOpen ? 'folderOpen' : ''}
          ${activeFileInfo?.fileInfoFromRemoteStorage?.id === fileFromList.id ? 'activeFile' : ''}
        `.replace(/\n/g, '').trim()}>

        {fileFromList &&
          <div className="ListItem__leftPart">
            <div className={`ListItem__expand ${fileFromList.folderOpen ? 'open' : ''}`}>
              {inProgress && <Spinner />}

              {fileFromList.mimeType === MimeTypesEnum.Folder && !inProgress &&
                <Icon>chevron_right</Icon>
              }
            </div>

            <div className="ListItem__icon">
              <Img
                src={fileFromList.iconLink}
                alt={fileFromList.name} />
            </div>

            <div
              className="ListItem__name">
              {fileFromList.name}
            </div>
          </div>
        }
      </div>

      {fileFromList.folderOpen && fileFromList.children && <div className="ListItem__children">
        {fileFromList.children.map(f => <ListItem
          key={f.id}
          fileFromList={f} />)
        }
      </div>}
    </div>
  );
};
