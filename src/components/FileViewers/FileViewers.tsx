import { useGapi } from "reactHooks/gapi/useGapi.hook";
import { useExplorer } from "reactHooks/fileManager/explorer/explorer.hook";
import { useGoogleAuth } from "reactHooks/gis/googleAuth.hook";
import { useActiveFile } from "reactHooks/fileManager/activeFile/activeFile.hook";
import { lazy, Suspense, useEffect, useRef, useState } from "react";

import { log } from "services/log/log.service";
import { useHotkeyZone } from "services/keyboardEvents/useHotkeyZone";
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
import { useRecoilState } from "recoil";
import { explorerSelector } from "state/localState/explorerState";

import "./FileViewers.css";

// import { marked } from "marked";

const PDFViewer = lazy(() => import('./Viewers/PDFViewer/PDFViewer'));
const TextEditor = lazy(() => import('./Viewers/TextEditor/TextEditor'));
const ImageViewer = lazy(() => import('./Viewers/ImageViewer/ImageViewer'));
const VideoViewer = lazy(() => import('./Viewers/VideoViewer/VideoViewer'));
const PasswordEditor = lazy(() => import('./Viewers/PasswordEditor/PasswordEditor'));

type Props = {};

type GDRevision = {
  id: string;
  modifiedTime?: string;
  keepForever?: boolean;
  lastModifyingUser?: {
    displayName?: string;
    emailAddress?: string;
  };
};

export const FileViewer: React.FC<Props> = () => {
  const [, setFilesState] = useRecoilState(explorerSelector);
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
  const {
    openPickerForFile,
    rootId,
    createFile,
    updateGDFile,
    getGDRevisionsList,
    getGDFileRevisionContent,
  } = useGapi();

  const historyPanelRef = useRef<HTMLDivElement>(null);
  const viewerZone = useHotkeyZone('viewer');

  const [message, setMessage] = useState<EditorMessageType | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRollingBack, setHistoryRollingBack] = useState(false);
  const [fileRevisions, setFileRevisions] = useState<GDRevision[]>([]);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string>(null);

  const canSave = currentUser?.loggedIn && activeFileInfo.isFileChangedLocaly && !activeFileInfo?.isFileSavedToRemoteStorage;
  const canUseRevisionHistory = activeFileInfo?.viewType === ViewerType.TEXT || activeFileInfo?.viewType === ViewerType.PASSWORD;

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

  const formatRevisionDate = (dateIso: string) => {
    if (!dateIso) return 'Unknown date';

    return new Date(dateIso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  useEffect(() => {
    if (!historyOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (historyPanelRef.current && !historyPanelRef.current.contains(e.target as Node)) {
        setHistoryOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [historyOpen]);

  const resetHistoryState = () => {
    setHistoryOpen(false);
    setHistoryLoading(false);
    setHistoryRollingBack(false);
    setFileRevisions([]);
    setSelectedRevisionId(null);
  }

  const loadHistory = async () => {
    if (!activeFileModel?.id) return;

    setHistoryLoading(true);

    try {
      const revisions = await getGDRevisionsList({ fileId: activeFileModel.id });

      setFileRevisions(revisions);
      setSelectedRevisionId(revisions?.[0]?.id || null);
    } catch (error) {
      log.error('Error loading file revisions', error);
      setFileRevisions([]);
      setSelectedRevisionId(null);
    } finally {
      setHistoryLoading(false);
    }
  }

  const toggleHistory = async () => {
    if (!historyOpen) {
      setHistoryOpen(true);
      await loadHistory();
      return;
    }

    setHistoryOpen(false);
  }

  const selectedRevision = fileRevisions.find(revision => revision.id === selectedRevisionId);

  const loadSelectedRevisionToEditor = async () => {
    if (!activeFileModel?.id || !selectedRevisionId) return;

    setHistoryLoading(true);

    try {
      const revisionContent = await getGDFileRevisionContent({
        fileId: activeFileModel.id,
        revisionId: selectedRevisionId,
      });

      setActiveFileContent(revisionContent);
      setActiveFileInfo({
        changeFileInView: true,
        isFileSavedToRemoteStorage: false,
        isFileChangedLocaly: true,
      });
    } catch (error) {
      log.error('Error loading selected revision content', error);
    } finally {
      setHistoryLoading(false);
    }
  }

  const rollbackToSelectedRevision = async () => {
    if (!activeFileModel?.id || !selectedRevisionId) return;

    const confirmRollback = window.confirm('Restore this revision as the latest file version?');
    if (!confirmRollback) return;

    setHistoryRollingBack(true);

    try {
      const revisionContent = await getGDFileRevisionContent({
        fileId: activeFileModel.id,
        revisionId: selectedRevisionId,
      });

      await updateGDFile(activeFileModel, revisionContent);
      await loadFileFromRS(activeFileModel);
      await loadHistory();
    } catch (error) {
      log.error('Error rolling back file to selected revision', error);
    } finally {
      setHistoryRollingBack(false);
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

  useEffect(() => {
    resetHistoryState();
  }, [activeFileModel?.id]);

  const renderFileLink = () => {
    if (!activeFileModel) return null;

    return (
      <div className="FileViewer__driveOnly">
        <div className="FileViewer__driveOnlyCard">
          <Img
            src={googleDriveSvg}
            alt="Google Drive"
            className="FileViewer__driveOnlyIcon" />

          <h3>Preview available in Google Drive</h3>

          <p>
            This file type is not supported by the built-in viewer.
            Open it in Google Drive to see and edit the original file.
          </p>

          <div className="FileViewer__driveOnlyMeta">
            <span>{activeFileModel.name}</span>
            <span>{activeFileModel.mimeType || activeFileModel.extension || 'Unknown type'}</span>
          </div>

          {activeFileModel.webViewLink &&
            <a
              href={activeFileModel.webViewLink}
              target="_blank"
              className="button FileViewer__driveOnlyButton">
              Open in Google Drive
            </a>
          }
        </div>
      </div>
    );
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

  const deselectExplorerFiles = () => {
    setFilesState({
      selectedFileIds: [],
      lastSelectedFileId: null,
      selectionAnchorFileId: null,
    });
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
      case ViewerType.VIDEO:
        return (
          <Suspense fallback={<Loader />}>
            <VideoViewer />
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
    <div
      className={`FileViewer__container${viewerZone.isActive ? ' zone--active' : ''}`}
      onClick={() => { viewerZone.activate(); deselectExplorerFiles(); }}>
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

      {currentUser?.loggedIn && activeFileModel &&
        <div className='FileViewer__bottomBar'>
          <div className="FileViewer__bottomBar__left">
            {activeFileModel?.extension}
            {activeFileModel?.extension && <div> | </div>}
            {activeFileModel?.mimeType}
          </div>

          <div className="FileViewer__bottomBar__right">
            {canUseRevisionHistory &&
              <button
                title="Show file history"
                onClick={toggleHistory}
                disabled={historyRollingBack || activeFileInfo?.isFileSavingToRemoteStorage}
                className="FileViewer__buttonHistory">
                {historyLoading && historyOpen ? <Spinner size="0.9rem" /> : 'History'}
              </button>
            }

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

          {historyOpen &&
            <div className="FileViewer__historyPanel" ref={historyPanelRef}>
              <div className="FileViewer__historyHeader">
                <b>Version History</b>
                {!fileRevisions.length && !historyLoading && <span>No revision history found</span>}
              </div>

              {fileRevisions.length > 0 &&
                <>
                  <select
                    className="FileViewer__historySelect"
                    value={selectedRevisionId || ''}
                    onChange={(e) => setSelectedRevisionId(e.target.value)}>
                    {fileRevisions.map((revision) => {
                      const userName = revision.lastModifyingUser?.displayName
                        || revision.lastModifyingUser?.emailAddress
                        || 'Unknown user';

                      return (
                        <option
                          key={revision.id}
                          value={revision.id}>
                          {formatRevisionDate(revision.modifiedTime)} - {userName}{revision.keepForever ? ' (kept)' : ''}
                        </option>
                      );
                    })}
                  </select>

                  <div className="FileViewer__historyDetails">
                    <span>
                      Selected: {formatRevisionDate(selectedRevision?.modifiedTime)}
                    </span>
                    <span>
                      By: {selectedRevision?.lastModifyingUser?.displayName || selectedRevision?.lastModifyingUser?.emailAddress || 'Unknown user'}
                    </span>
                  </div>

                  <div className="FileViewer__historyActions">
                    <button
                      onClick={loadSelectedRevisionToEditor}
                      disabled={!selectedRevisionId || historyLoading || historyRollingBack}>
                      Load version
                    </button>
                    <button
                      onClick={rollbackToSelectedRevision}
                      disabled={!selectedRevisionId || historyLoading || historyRollingBack}
                      className="warn">
                      {historyRollingBack ? <Spinner size="0.9rem" /> : 'Rollback'}
                    </button>
                  </div>
                </>
              }
            </div>
          }
        </div>
      }
    </div>
  );
}
