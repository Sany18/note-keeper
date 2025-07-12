import { useExplorer } from "reactHooks/fileManager/explorer/explorer.hook";

import { useRecoilState } from "recoil";
import { fileUploadingSelector } from "state/sessionState/fileUploadingState";

export const useUploadFiles = () => {
  const [fileUploading, setFileUploading] = useRecoilState(fileUploadingSelector);

  const { rootFolderId } = useExplorer();

  const uploadFiles = (files: File[], parentId: string) => {
    setFileUploading({
      filesToUpload: files.map(file => ({ file, parentId })),
    });
  }

  const openUploadDialog = (parentId?: string): void => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.click();

    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files);
      uploadFiles(files, parentId || rootFolderId);
    }
  }

  return {
    progress: fileUploading.progress,
    inProgress: fileUploading.inProgress,
    fileUploading,
    uploadFiles,
    openUploadDialog,
  }
}
