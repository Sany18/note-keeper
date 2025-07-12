import { File } from "dtos/file.model";
import { ViewerType } from "components/FileViewers/FileViewers.types";
import { MimeTypesEnum } from "const/mimeTypes/mimeTypes.const";
import { ExtensionEnum } from "const/fileExtensions/fileExtensions.const";

export const getFileFromNameExt = (fileName: string) => {
  const fileNameParts = fileName?.split('.');

  if (!fileNameParts) {
    return;
  }

  if (fileNameParts.length === 1) {
    return;
  } else {
    return fileNameParts.at(-1);
  }
}

export const getViewTypeFromFile = (file: File): ViewerType => {
  const fileExt = getFileFromNameExt(file?.name);
  const mimeType = file?.mimeType;

  switch (fileExt) {
    case ExtensionEnum.TXT:
      return ViewerType.TEXT;
    case ExtensionEnum.DRAWIO:
      return ViewerType.GOOGLE_DRIVE_LINK;
    case ExtensionEnum.PASS:
      return ViewerType.PASSWORD;
  }

  switch (mimeType) {
    case MimeTypesEnum.Json:
    case MimeTypesEnum.Text:
      return ViewerType.TEXT;
    case MimeTypesEnum.Png:
    case MimeTypesEnum.Jpeg:
    case MimeTypesEnum.Gif:
    case MimeTypesEnum.Bmp:
    case MimeTypesEnum.Svg:
    case MimeTypesEnum.Webp:
      return ViewerType.IMAGE;
    case MimeTypesEnum.Pdf:
      return ViewerType.PDF;
    case MimeTypesEnum.Spreadsheet:
      return ViewerType.GOOGLE_DRIVE_LINK;
    default:
      return ViewerType.UNKNOWN;
  }
}
