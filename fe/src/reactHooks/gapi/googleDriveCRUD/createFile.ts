import { log } from "services/log/log.service";

import { fieldsArray } from "../../../const/remoteStorageProviders/googleDrive/gapi.parameters";

export const createGDFile = ({ handleError }) => (name: string, mimeType: string, parents: string[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    window.gapi.client.drive.files.create({
      fields: fieldsArray.join(','),
      resource: {
        name,
        mimeType,
        parents,
      },
    }).then((response) => {
      log.appEvent('File created:', response);
      resolve(response);
    }).catch((error) => {
      handleError('createFile', error, name);
      reject(error);
    });
  });
};
