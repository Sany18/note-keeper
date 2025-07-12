import { log } from "services/log/log.service";

import { fieldsArray } from "../../../const/remoteStorageProviders/googleDrive/gapi.parameters";
import { openPickerForFile } from "./filePicker";

type GetFileParams = {
  id: string;
  name: string;
};

export const getGDFile = ({ handleError }) => (fileInfo: GetFileParams): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    const params = {
      fileId: fileInfo.id,
      alt: 'media',
      webContentLink: true,
      fields: fieldsArray.join(','),
    };

    try {
      const response = await window.gapi.client.drive.files.get(params)
      log.appEvent('Downloaded file from GD:', response);
      resolve(response.body);
    } catch (error) {
      try {
        if (error.status === 403) {
          await openPickerForFile(fileInfo.name);
          const resp = await getGDFile({ handleError })(fileInfo);
          resolve(resp);
        } else {
          handleError('getGDFile', error, fileInfo.name);
          reject(error);
        }
      } catch {
        reject(error);
      }
    }
  });
}
