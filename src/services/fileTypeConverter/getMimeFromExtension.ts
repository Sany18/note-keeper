import { MimeTypesEnum } from 'const/mimeTypes/mimeTypes.const';
import { ExtensionEnum } from 'const/fileExtensions/fileExtensions.const';

export const getMimeFromExtension = (extension: string): string => {
  const mimeTypes = {
    [ExtensionEnum.TXT]: MimeTypesEnum.Text,
  };

  return mimeTypes[extension] || MimeTypesEnum.Text;
}
