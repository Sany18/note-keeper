import { log } from "services/log/log.service";

import { File } from "dtos/file.model";
import { fieldsArray } from "../../../const/remoteStorageProviders/googleDrive/gapi.parameters";
import { openPickerForFile } from "./filePicker";

export const updateFile = ({
  handleError,
  setCurrentFile
}) => (fileInfo: File, content: string): Promise<any> => {
  log.appEvent(`useGapi: Update file...: ${fileInfo.name}`);
  setCurrentFile({
    error: null,
    isFileSavingToRemoteStorage: true,
  });

  return new Promise(async (resolve, reject) => {
    const params = {
      path: `https://www.googleapis.com/upload/drive/v3/files/${fileInfo.id}`,
      method: 'PATCH',
      params: {
        uploadType: 'media',
        fields: fieldsArray.join(','),
      },
      body: content,
    };

    try {
      const response = await window.gapi.client.request(params);
      log.appEvent(`useGapi: File updated: ${fileInfo.name}`, response);
      setCurrentFile({
        error: null,
        contentUpdatedLocalyAt: new Date().toISOString(), // To fix GD version became always newer
        isFileSavedToRemoteStorage: true,
        isFileSavingToRemoteStorage: false,
        isFileUpdatedFromRemoteStorage: false,
      });
      resolve(response);
    } catch (error) {
      try {
        if (error.status === 403) {
          await openPickerForFile(fileInfo.name);
          const resp = await updateFile({ handleError, setCurrentFile })(fileInfo, content);
          resolve(resp);
        } else {
          setCurrentFile({
            isFileSavedToRemoteStorage: false,
            isFileSavingToRemoteStorage: false,
            isFileUpdatedFromRemoteStorage: false,
            error
          });
          handleError('getGDFile', error, fileInfo.name);
          reject(error);
        }
      } catch {
        reject(error);
      }
    }
  });
};
