import { log } from "services/log/log.service";

import { File } from "dtos/file.model";
import { fieldsArray } from "../../../const/remoteStorageProviders/googleDrive/gapi.parameters";

export const copyFile = ({ handleError }) => (fileInfo: File, parentId?: string): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      const targetParentId = parentId || fileInfo.parents?.[0];
      const copiedName = `${fileInfo.name} (copy)`;
      const resource = targetParentId
        ? { name: copiedName, parents: [targetParentId] }
        : { name: copiedName };

      const response = await window.gapi.client.drive.files.copy({
        fileId: fileInfo.id,
        fields: fieldsArray.join(','),
        resource,
      });

      log.appEvent('File copied:', response);
      resolve(response);
    } catch (error) {
      handleError('copyGDFile', error, fileInfo.name);
      reject(error);
    }
  });
};