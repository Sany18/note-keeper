import { useGapi } from "reactHooks/gapi/useGapi.hook";
import { useState } from "react";
import { useActiveFile } from "reactHooks/fileManager/activeFile/activeFile.hook";

import { getViewTypeFromFile } from "services/fileTypeConverter/getFileTypeFromName";

import { defaultActiveFileInfoState } from "state/localState/activeFile/activeFileInfoState";

import { File } from "dtos/file.model";
import { ViewerType } from "components/FileViewers/FileViewers.types";

type Props = {};

export const useFileViewerService = () => {
  const { setActiveFileInfo, setActiveFileContent } = useActiveFile();

  const [inProgress, setInProgress] = useState(false);

  const { getFile } = useGapi();

  ///////////////////////////////
  // Intrerupting file downloading
  // If file don't need to be downloaded
  // or has another way to be viewed
  ///////////////////////////////
  const loadFileFromRS = async (fileInfo: File) => {
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

    //////////////////////////////
    // Actual file downloading
    //////////////////////////////
    setInProgress(true);

    setActiveFileInfo({
      ...defaultState,
      fileInfoFromRemoteStorage: fileInfo,
      isFileDownloadingFromRemoteStorage: true,
    });

    try {
      const GDFile: string = await getFile(fileInfo);

      setActiveFileContent(GDFile);
      setActiveFileInfo({
        changeFileInView: true,
        isFileDownloadingFromRemoteStorage: false,
      });

      setInProgress(false);
    } catch (error) {
      setActiveFileInfo({
        ...defaultState,
        error,
        fileInfoFromRemoteStorage: fileInfo,
        isFileDownloadingFromRemoteStorage: false,
      });

      setInProgress(false);
    }
  };

  return {
    inProgress,
    setInProgress,
    loadFileFromRS,
  }
};
