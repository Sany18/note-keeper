import { useCallback } from "react";

import { log } from "services/log/log.service";

import { useGapi } from "./gapi/useGapi.hook";
import { useActiveFile } from "./fileManager/activeFile/activeFile.hook";
import { useDebouncedCallback } from "use-debounce";
import { localSaveDebounceTime } from "const/localSaveDebounceTime";

export const useFileSaveService = () => {
  const { updateGDFile } = useGapi();
  const { activeFileInfo, setActiveFileInfo, setActiveFileContent } = useActiveFile();

  const saveLocallyDebounced = useDebouncedCallback((content) => {
    // log.appEvent("FileViewer: Saving content locally. File ID:", currentFile.fileInfoFromRemoteStorage?.name);
    saveLocally(content);
  }, localSaveDebounceTime);

  const saveLocally = useCallback((content) => {
    saveLocallyDebounced.cancel();

    setActiveFileContent(content);
    setActiveFileInfo({
      contentUpdatedLocalyAt: new Date().toISOString(),
      isFileSavedToRemoteStorage: false,
      isFileSavedLocaly: true,
      isFileChangedLocaly: true,
      isFileUpdatedFromRemoteStorage: false,
    });
  }, [saveLocallyDebounced, activeFileInfo?.fileInfoFromRemoteStorage?.id, setActiveFileInfo]);

  const saveFileToGD = (content) => {
    if (!activeFileInfo.fileInfoFromRemoteStorage) {
      log.error("FileViewer: File not saved. fileInfoFromRemoteStorage is not defined.");
      return;
    }

    if (activeFileInfo.fileInfoFromRemoteStorage && content !== null && content !== undefined) {
      saveLocally(content);
      updateGDFile(activeFileInfo.fileInfoFromRemoteStorage, content)
    }
  };

  return {
    saveLocally, // Do not use this function directly. Only for file-save-service
    saveFileToGD,
    saveLocallyDebounced,
  };
}
