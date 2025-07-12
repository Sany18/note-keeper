import { log } from "services/log/log.service";

import { File } from "dtos/file.model";
import { fieldsArray } from "../../../const/remoteStorageProviders/googleDrive/gapi.parameters";

export const getGDFileInfo = ({ handleError }) => (fileInfo: File): Promise<any> => {
  return new Promise((resolve, reject) => {
    const params = {
      fileId: fileInfo.id,
      fields: fieldsArray.join(','),
    };

    window.gapi.client.drive.files.get(params).then((response) => {
      log.appEvent('Downloaded file info from GD:', response);
      resolve(response.result);
    }).catch((error) => {
      handleError('getCurrentFileInfo', error, fileInfo.name);
      // reject(error);
    });
  });
};
