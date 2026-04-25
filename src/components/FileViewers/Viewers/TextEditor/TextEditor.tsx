import { useGoogleAuth } from "reactHooks/gis/googleAuth.hook";
import { useActiveFile } from "reactHooks/fileManager/activeFile/activeFile.hook";
import { useFileSaveService } from "reactHooks/file-save-service";
import { useCallback, useEffect, useRef } from "react";

import { log } from "services/log/log.service";
import { keyCodes } from "services/keyboardEvents/keyCodes.const";
import { useHotkey } from "services/keyboardEvents/useHotkey";

import { handleIndentation, handleNewLine, handleTabInsertion } from "../HotkeysHandlers.service";

import "./TextEditor.css";
import { appEvents } from "state/events";

type Props = {};

const TextEditor: React.FC<Props> = () => {
  const { saveFileToGDDebounced, saveFileToGD } = useFileSaveService();
  const { activeFileInfo, setActiveFileInfo, activeFileContent } = useActiveFile();

  const editorContentRef = useRef(null);

  const { currentUser } = useGoogleAuth();

  const content = () => editorContentRef.current.value;

  const onInputHandler = useCallback(() => {
    saveFileToGDDebounced(content());

    const { isFileSavedToRemoteStorage, isFileChangedLocaly } = activeFileInfo;
    if (isFileSavedToRemoteStorage || !isFileChangedLocaly) {
      setActiveFileInfo({
        isFileSavedToRemoteStorage: false,
        isFileChangedLocaly: true,
      });
    }
  }, [activeFileInfo, setActiveFileInfo, saveFileToGDDebounced]);

  const persistCurrentContent = useCallback((saveToRemote?: boolean) => {
    if (!editorContentRef.current || !activeFileInfo?.fileInfoFromRemoteStorage) return;

    const currentContent = content();

    if (saveToRemote && activeFileInfo?.isFileChangedLocaly) {
      saveFileToGD(currentContent);
    }
  }, [activeFileInfo, saveFileToGD]);

  useHotkey('viewer', `ctrl+${keyCodes.s}`, (e) => { e.preventDefault(); saveFileToGD(content()); }, 'Save file');
  useHotkey('viewer', keyCodes.tab, (e) => handleTabInsertion(e, editorContentRef.current), 'Insert tab');
  useHotkey('viewer', `ctrl+${keyCodes.bracketLeft}`, (e) => handleIndentation(e, editorContentRef.current, true), 'Decrease indent');
  useHotkey('viewer', `ctrl+${keyCodes.bracketRight}`, (e) => handleIndentation(e, editorContentRef.current), 'Increase indent');
  useHotkey('viewer', `ctrl+shift+${keyCodes.enter}`, (e) => handleNewLine(e, editorContentRef.current, true), 'New line above');
  useHotkey('viewer', `ctrl+${keyCodes.enter}`, (e) => handleNewLine(e, editorContentRef.current), 'New line below');

  // Update only if user opens file from explorer
  useEffect(() => {
    if (!activeFileInfo?.changeFileInView || activeFileInfo?.isFileDownloadingFromRemoteStorage) return;

    const waitingForRemoteContent = activeFileInfo?.isFileUpdatedFromRemoteStorage && activeFileContent === null;

    if (waitingForRemoteContent) return;

    if (editorContentRef.current) {
      log.appEvent("FileViewer: File loaded. File name:", activeFileInfo.fileInfoFromRemoteStorage?.name);

      editorContentRef.current.value = activeFileContent || "";
    }

    setActiveFileInfo({ changeFileInView: false });
  }, [
    activeFileInfo?.changeFileInView,
    activeFileInfo?.isFileDownloadingFromRemoteStorage,
    activeFileInfo?.isFileUpdatedFromRemoteStorage,
    activeFileInfo?.fileInfoFromRemoteStorage?.id,
    activeFileContent,
    setActiveFileInfo,
  ]);

  useEffect(() => {
    const onSave = () => {
      if (!activeFileInfo) return;
      saveFileToGD(content());
    }

    appEvents.onSaveToGoogleDrive.on(onSave);

    return () => {
      appEvents.onSaveToGoogleDrive.off(onSave);
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      persistCurrentContent(true);
    }

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [persistCurrentContent]);

  return (
    <div className={`TextEditor__wrapper ${currentUser?.loggedIn && !activeFileInfo?.isFileDownloadingFromRemoteStorage && "view"}`}>
      <textarea
        ref={editorContentRef}
        onChange={onInputHandler}
        onBlur={() => persistCurrentContent()}>
      </textarea>
    </div>
  );
}

export default TextEditor;
