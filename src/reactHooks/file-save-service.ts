import { useCallback } from "react";

import { log } from "services/log/log.service";

import { useGapi } from "./gapi/useGapi.hook";
import { useActiveFile } from "./fileManager/activeFile/activeFile.hook";
import { useDebouncedCallback } from "use-debounce";
import { localSaveDebounceTime } from "const/localSaveDebounceTime";

export const useFileSaveService = () => {
  const { updateGDFile } = useGapi();
  const { activeFileInfo, setActiveFileInfo, setActiveFileContent } = useActiveFile();

  const saveFileToGD = (content) => {
    if (!activeFileInfo.fileInfoFromRemoteStorage) {
      log.error("FileViewer: File not saved. fileInfoFromRemoteStorage is not defined.");
      return;
    }

    if (activeFileInfo.fileInfoFromRemoteStorage && content !== null && content !== undefined) {
      setActiveFileContent(content);
      setActiveFileInfo({
        contentUpdatedLocalyAt: new Date().toISOString(),
        isFileSavedToRemoteStorage: false,
        isFileSavedLocaly: false,
        isFileChangedLocaly: true,
        isFileUpdatedFromRemoteStorage: false,
      });

      updateGDFile(activeFileInfo.fileInfoFromRemoteStorage, content)
    }
  };

  const saveFileToGDDebounced = useDebouncedCallback((content) => {
    saveFileToGD(content);
  }, localSaveDebounceTime);

  return {
    saveFileToGD,
    saveFileToGDDebounced,
  };
}
