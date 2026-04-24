import { MimeTypesEnum } from "const/mimeTypes/mimeTypes.const";

export const foldersFirts = (a, b) => {
  const isAFolder = a.mimeType === MimeTypesEnum.Folder;
  const isBFolder = b.mimeType === MimeTypesEnum.Folder;

  // Sort folders first
  if (isAFolder && !isBFolder) return -1;
  if (!isAFolder && isBFolder) return 1;
  if (isAFolder && isBFolder) return a.name.localeCompare(b.name);
  if (!isAFolder && !isBFolder) return a.name.localeCompare(b.name);
};
