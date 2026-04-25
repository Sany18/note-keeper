import { useGapi } from "reactHooks/gapi/useGapi.hook";
import { useState } from "react";
import { useActiveFile } from "reactHooks/fileManager/activeFile/activeFile.hook";

import { getViewTypeFromFile } from "services/fileTypeConverter/getFileTypeFromName";

import { defaultActiveFileInfoState } from "state/localState/activeFile/activeFileInfoState";

import { File } from "dtos/file.model";
import { ViewerType } from "components/FileViewers/FileViewers.types";

// Shared across all hook instances — only the most recent load applies its result
let activeLoadId = 0;

export const useFileViewerService = () => {
  const { setActiveFileInfo, setActiveFileContent } = useActiveFile();

  const [inProgress, setInProgress] = useState(false);

  const { getFile } = useGapi();

  const loadFileFromRS = async (fileInfo: File) => {
    const loadId = ++activeLoadId;

    const viewType = getViewTypeFromFile(fileInfo);
    const defaultState = {
      ...defaultActiveFileInfoState,
      viewType
    }

    setActiveFileContent(null);

    if (viewType === ViewerType.GOOGLE_DRIVE_LINK || viewType === ViewerType.UNKNOWN) {
      setActiveFileInfo({
        ...defaultState,
        fileInfoFromRemoteStorage: fileInfo,
        changeFileInView: true,
      });

      return;
    }

    if (viewType === ViewerType.PDF) {
      setActiveFileInfo({
        ...defaultState,
        error: null,
        changeFileInView: true,
        isFileDownloadingFromRemoteStorage: false,
      });

      return;
    }

    setInProgress(true);

    setActiveFileInfo({
      ...defaultState,
      fileInfoFromRemoteStorage: fileInfo,
      isFileDownloadingFromRemoteStorage: true,
    });

    try {
      const GDFile: string = await getFile(fileInfo);

      if (loadId !== activeLoadId) {
        setInProgress(false);
        return;
      }

      setActiveFileContent(GDFile);
      setActiveFileInfo({
        changeFileInView: true,
        isFileDownloadingFromRemoteStorage: false,
      });
    } catch (error) {
      if (loadId === activeLoadId) {
        setActiveFileInfo({
          ...defaultState,
          error,
          fileInfoFromRemoteStorage: fileInfo,
          isFileDownloadingFromRemoteStorage: false,
        });
      }
    } finally {
      setInProgress(false);
    }
  };

  return {
    inProgress,
    setInProgress,
    loadFileFromRS,
  }
};
