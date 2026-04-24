import { useGoogleAuth } from "reactHooks/gis/googleAuth.hook";
import { useActiveFile } from "reactHooks/fileManager/activeFile/activeFile.hook";
import { useFileSaveService } from "reactHooks/file-save-service";
import { useCallback, useEffect, useRef } from "react";

import DOMPurify from 'dompurify';

import { log } from "services/log/log.service";
import { keyCodes } from "services/keyboardEvents/keyCodes.const";

import { handleIndentation, handleNewLine, handleTabInsertion } from "../HotkeysHandlers.service";

import "./TextEditor.css";
import { appEvents } from "state/events";

type Props = {};

const TextEditor: React.FC<Props> = () => {
  const { saveLocallyDebounced, saveFileToGD } = useFileSaveService();
  const { activeFileInfo, setActiveFileInfo, activeFileContent } = useActiveFile();

  const editorContentRef = useRef(null);

  const { currentUser } = useGoogleAuth();

  const content = () => editorContentRef.current.value;

  const onInputHandler = useCallback(() => {
    saveLocallyDebounced(content());

    const { isFileSavedToRemoteStorage, isFileSavedLocaly, isFileChangedLocaly } = activeFileInfo;
    if (isFileSavedToRemoteStorage || isFileSavedLocaly || !isFileChangedLocaly) {
      setActiveFileInfo({
        isFileSavedToRemoteStorage: false,
        isFileSavedLocaly: false,
        isFileChangedLocaly: true,
      });
    }
  }, [activeFileInfo, setActiveFileInfo]);

  const onKeydown = useCallback((e: KeyboardEvent) => {
    const isCtrl = e.ctrlKey || e.metaKey;

    // Ctrl + S | Save document
    if (isCtrl && e.code === keyCodes.s) {
      e.preventDefault();
      saveFileToGD(content());
      return;
    }

    // Tab | Insert tabulation
    if (e.code === keyCodes.tab) {
      handleTabInsertion(e, editorContentRef.current);
      return;
    }

    // Ctrl + [ | Move line 1 tab left
    if (isCtrl && e.code === keyCodes.bracketLeft) {
      handleIndentation(e, editorContentRef.current, true);
      return;
    }

    // Ctrl + ] | Move line 1 tab right
    if (isCtrl && e.code === keyCodes.bracketRight) {
      handleIndentation(e, editorContentRef.current);
      return;
    }

    // Ctrl + Shift + Enter | Add new line above the current
    if (isCtrl && e.shiftKey && e.code === keyCodes.enter) {
      handleNewLine(e, editorContentRef.current, true);
      return;
    }

    // Ctrl + Enter | Add new line under the current
    if (isCtrl && e.code === keyCodes.enter) {
      handleNewLine(e, editorContentRef.current);
      return;
    }
  }, []);

  // Update only if user opens file from explorer
  useEffect(() => {
    if (!activeFileInfo.isFileDownloadingFromRemoteStorage && activeFileInfo.changeFileInView) {
      log.appEvent("FileViewer: File loaded. File name:", activeFileInfo.fileInfoFromRemoteStorage?.name);

      const content = DOMPurify.sanitize(activeFileContent || "");
      editorContentRef.current.value = content;

      setActiveFileInfo({ changeFileInView: false });
    }
  }, [activeFileInfo.changeFileInView, setActiveFileInfo]);

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
    window.addEventListener('keydown', onKeydown);

    return () => {
      window.removeEventListener('keydown', onKeydown);
    }
  }, [onKeydown]);

  return (
    <div className={`TextEditor__wrapper ${currentUser?.loggedIn && !activeFileInfo?.isFileDownloadingFromRemoteStorage && "view"}`}>
      <textarea
        ref={editorContentRef}
        onChange={onInputHandler}>
      </textarea>
    </div>
  );
}

export default TextEditor;
