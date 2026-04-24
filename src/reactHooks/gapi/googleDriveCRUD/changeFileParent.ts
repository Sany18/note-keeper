import { log } from "services/log/log.service";

import { File } from "dtos/file.model";
import { fieldsArray } from "../../../const/remoteStorageProviders/googleDrive/gapi.parameters";
import { openPickerForFile } from "./filePicker";

export const changeGDFileParent = ({ handleError }) => (fileInfo: File, newParentId: string): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    const params = {
      fileId: fileInfo.id,
      fields: fieldsArray.join(','),
      addParents: newParentId,
      removeParents: fileInfo.parents.join(','),
    };

    try {
      const response = await window.gapi.client.drive.files.update(params)
      log.appEvent('File parent changed:', response);
      resolve(response);
   } catch (error) {
      try {
        if (error.status === 403) {
          await openPickerForFile(fileInfo.name);
          const resp = await changeGDFileParent({ handleError })(fileInfo, newParentId);
          resolve(resp);
        } else {
          handleError('changeFileParent', error, fileInfo.name);
          reject(error);
        }
      } catch {
        reject(error);
      }
    }
  });
};
