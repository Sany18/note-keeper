import { useEffect, useRef, useState } from "react";
import { useActiveFile } from "reactHooks/fileManager/activeFile/activeFile.hook";

import { MimeTypesEnum } from "const/mimeTypes/mimeTypes.const";

import "./VideoViewer.css";

type Props = {};

const binaryStringToUint8Array = (binaryStr: string | null): Uint8Array => {
  if (!binaryStr) return new Uint8Array(0);

  const len = binaryStr.length;
  const uint8Array = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    uint8Array[i] = binaryStr.charCodeAt(i);
  }

  return uint8Array;
};

const VideoViewer: React.FC<Props> = () => {
  const { activeFileInfo, setActiveFileInfo, activeFileContent } = useActiveFile();

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeFileInfo?.changeFileInView || activeFileInfo?.isFileDownloadingFromRemoteStorage) {
      return;
    }

    if (activeFileContent === null) {
      return;
    }

    const uint8Array = binaryStringToUint8Array(activeFileContent);
    const blob = new Blob([uint8Array], {
      type: activeFileInfo.fileInfoFromRemoteStorage?.mimeType || MimeTypesEnum.Video,
    });
    const nextUrl = URL.createObjectURL(blob);

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    objectUrlRef.current = nextUrl;
    setVideoUrl(nextUrl);
    setActiveFileInfo({ changeFileInView: false });
  }, [
    activeFileInfo?.changeFileInView,
    activeFileInfo?.isFileDownloadingFromRemoteStorage,
    activeFileInfo?.fileInfoFromRemoteStorage?.id,
    activeFileContent,
    setActiveFileInfo,
  ]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  return (
    <div className="VideoViewer">
      {videoUrl && (
        <video
          className="VideoViewer__player"
          controls
          preload="metadata"
          src={videoUrl}
        />
      )}
    </div>
  );
};

export default VideoViewer;
