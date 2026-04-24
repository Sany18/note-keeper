import { log } from "services/log/log.service";

import { File } from "dtos/file.model";
import { openPickerForFile } from "./filePicker";

export const deleteFileForever = ({ handleError }) => (fileInfo: File): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    const params = {
      fileId: fileInfo.id,
    };

    try {
      const response = await window.gapi.client.drive.files.delete(params)
      log.appEvent('File deleted forever:', response);
      resolve(response);
    } catch (error) {
      try {
        if (error.status === 403) {
          await openPickerForFile(fileInfo.name);
          const resp = await deleteFileForever({ handleError })(fileInfo);
          resolve(resp);
        } else {
          handleError('deleteGDFileForever', error, fileInfo.name);
          reject(error);
        }
      } catch {
        reject(error);
      }
    }
  });
};
