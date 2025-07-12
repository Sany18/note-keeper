import { useGapi } from "reactHooks/gapi/useGapi.hook";
import { useExplorer } from "reactHooks/fileManager/explorer/explorer.hook";
import { useGoogleAuth } from "reactHooks/gis/googleAuth.hook";
import { useActiveFile } from "reactHooks/fileManager/activeFile/activeFile.hook";
import { lazy, Suspense, useEffect, useState } from "react";

import { log } from "services/log/log.service";
import { ctrlBtnName } from "services/clientDevice/getPlatform";
import { appendChildToFolder } from "services/tree/treeHelpers";
import { useFileViewerService } from "services/FileViewer/fileViewer.service";

import { Img } from "components/Atoms/Img/Img";
import { Icon } from "components/Atoms/Icon/Icon";
import { File } from "dtos/file.model";
import { Loader } from "components/Loader/Loader";
import { Spinner } from "components/Spinner/Spinner";
import { EditorMessageType, MessageType, ViewerType } from "./FileViewers.types";
import { appEvents } from "state/events";
import { WelcomePage } from "components/WelcomePage/WelcomePage";
import { MimeTypesEnum } from "const/mimeTypes/mimeTypes.const";
import { mainFolderName } from "const/remoteStorageProviders/googleDrive/mainFolderName";
import googleDriveSvg from "assets/icons/google-drive.svg";

import "./FileViewers.css";

// import { marked } from "marked";

const PDFViewer = lazy(() => import('./Viewers/PDFViewer/PDFViewer'));
const TextEditor = lazy(() => import('./Viewers/TextEditor/TextEditor'));
const ImageViewer = lazy(() => import('./Viewers/ImageViewer/ImageViewer'));
const PasswordEditor = lazy(() => import('./Viewers/PasswordEditor/PasswordEditor'));

type Props = {};

export const FileViewer: React.FC<Props> = () => {
  const { setExplorerInProgress, setTree } = useExplorer();
  const {
    activeFileModel,
    setActiveFileModel,
    activeFileInfo,
    setActiveFileInfo,
    activeFileContent,
    setActiveFileContent
  } = useActiveFile();

  const { fileTree } = useExplorer();

  const { currentUser } = useGoogleAuth();
  const { loadFileFromRS } = useFileViewerService();
  const { openPickerForFile, rootId, createFile } = useGapi();

  const [message, setMessage] = useState<EditorMessageType | null>(null);

  const canSave = currentUser?.loggedIn && activeFileInfo.isFileChangedLocaly && !activeFileInfo?.isFileSavedToRemoteStorage;

  const closeFile = () => {
    if (!activeFileInfo?.isFileSavedToRemoteStorage && !activeFileInfo?.isFileSavingToRemoteStorage) {
      const confirmClose = window.confirm('The file is not saved. Close anyway?');

      if (!confirmClose) return;
    }

    setActiveFileInfo(null);
    setActiveFileModel(null);
  }

  const getAccessToFile = async () => {
    try {
      await openPickerForFile(activeFileModel?.name);
      await loadFileFromRS(activeFileModel);
    } catch (error) {
      log.error('Error while getting access to file:', error);
    }
  }

  useEffect(() => {
    if (!currentUser.loggedIn) {
      setMessage({
        type: MessageType.INFO,
        title: "Please login to see your Google Drive files.",
      });
      return;
    }

    if (currentUser.loggedIn && !activeFileModel) {
      setMessage({ type: MessageType.SUCCESS, title: "Select a file to view or edit." });
      return;
    }

    if (activeFileModel) {
      setMessage({
        type: MessageType.STATUS,
        title: <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Img
            src={activeFileModel.iconLink}
            alt={activeFileModel.mimeType}
            className="FileViewer__fileIcon" />
          {activeFileModel.name}
        </div>,
        messageContent: <>
          { !activeFileInfo?.isFileSavedToRemoteStorage && !activeFileInfo?.isFileSavingToRemoteStorage && <span>(unsaved)</span> }
          { activeFileInfo?.isFileSavingToRemoteStorage && <Spinner size="1rem" /> }
          <button
            title="Close file"
            onClick={closeFile}
            className="button-flat FileViewer__closeFileButton">
            <Icon size='1.5rem'>close</Icon>
          </button>
        </>
      });
      return;
    }
  }, [
    currentUser?.loggedIn,
    activeFileModel,
    activeFileInfo,
  ]);

  const renderFileLink = () => {
    return activeFileModel?.webViewLink &&
      <div className="FileViewer__message">
        The file can be viewed only in Google Drive.
        <a
          href={activeFileModel?.webViewLink}
          target="_blank"
          className="button">
          Open in Google Drive
        </a>
      </div>
  }

  const renderHaveNoAccess = () => {
    return <div className="FileViewer__message warning">
      The application does not have permission to access the file.

      <button
        onClick={getAccessToFile}>
        Provide access
      </button>

      {activeFileModel?.webViewLink &&
        <>
          or
          <a
            href={activeFileModel?.webViewLink}
            target="_blank"
            className="button">Open in Google Drive</a>
        </>
      }
    </div>
  }

  const createNewTextFile = () => {
    setTimeout(() => {
      const fileName = window.prompt(`Create a file in "${mainFolderName}"\nEnter file name`);

      if (!fileName) return;

      setExplorerInProgress(true);

      createFile(fileName, MimeTypesEnum.Text, [rootId])
        .then((response) => {
          const newFile = new File(response.result);
          const newTree = appendChildToFolder<File>(fileTree, rootId, newFile, true);

          setTree(newTree);
          setActiveFileModel(newFile);
          setActiveFileContent(null);
          setActiveFileInfo({ fileInfoFromRemoteStorage: newFile });
        })
        .catch((error) => {
          log.error('Error creating file', error);
        })
        .finally(() => {
          setExplorerInProgress(false);
        });
    }, 0);
  };

  const renderCreateFastNoteButton = () => {
    return <>
      <button
        title="Create new text file"
        onClick={createNewTextFile}
        className="FileViewer__buttonCreateNote">
        <Icon size='2rem'>add</Icon>
      </button>
    </>
  }

  const currentViewer = () => {
    if (!currentUser?.loggedIn) {
      return <WelcomePage />
    }

    if (activeFileInfo?.error?.status === 403) {
      return renderHaveNoAccess();
    }

    // Undefined is for the case when the viewer is loaded but the file is not started downloading
    // It happed because we are waiting for the gapi initialization
    if (activeFileInfo?.isFileDownloadingFromRemoteStorage || activeFileInfo?.isFileDownloadingFromRemoteStorage === undefined) {
      return <Loader />
    }

    if (currentUser.loggedIn && !activeFileModel) {
      return renderCreateFastNoteButton();
    }

    switch (activeFileInfo.viewType) {
      case ViewerType.TEXT:
        return (
          <Suspense fallback={<Loader />}>
            <TextEditor />
          </Suspense>
        )
      case ViewerType.IMAGE:
        return (
          <Suspense fallback={<Loader />}>
            <ImageViewer />
          </Suspense>
        )
      case ViewerType.PDF:
        return (
          <Suspense fallback={<Loader />}>
            <PDFViewer />
          </Suspense>
        )
      case ViewerType.PASSWORD:
        return (
          <Suspense fallback={<Loader />}>
            <PasswordEditor />
          </Suspense>
        )
      case ViewerType.GOOGLE_DRIVE_LINK:
      case ViewerType.UNKNOWN:
      default:
        return renderFileLink();
    }
  };

  return (
    <div className="FileViewer__container">
      <div className="FileViewer__topBar">
        {message &&
          <div className={`FileViewer__message ${message.type}`}>
            <b>{message.title}</b>
            {message.messageContent}
          </div>
        }
      </div>

      <div className="FileViewer">
        {currentViewer()}
      </div>

      {activeFileModel &&
        <div className='FileViewer__bottomBar'>
          <div className="FileViewer__bottomBar__left">
            {activeFileModel?.extension}
            {activeFileModel?.extension && <div> | </div>}
            {activeFileModel?.mimeType}
          </div>

          <div className="FileViewer__bottomBar__right">
            <a
              href={activeFileModel.webViewLink}
              target="_blank"
              className="button">
              Open in
              <Img
                src={googleDriveSvg}
                alt="Google Drive"
                className="FileViewer__googleDriveIcon" />
            </a>

            {activeFileModel
              && activeFileContent !== undefined
              && activeFileContent !== null
              && <button
                title={`Save (${ctrlBtnName} + S)`}
                onClick={appEvents.onSaveToGoogleDrive.emit}
                disabled={!canSave || activeFileInfo?.isFileSavingToRemoteStorage}
                className="FileViewer__buttonSave">
                {activeFileInfo?.isFileSavingToRemoteStorage ? <Spinner size="0.9rem" /> : 'Save'}
              </button>
            }
          </div>
        </div>
      }
    </div>
  );
}
