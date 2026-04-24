import { foldersFirts } from "services/sortFiles/foldersFirst";

import { File } from "dtos/file.model";

export const getList = ({ handleError }) => (params: any): Promise<File[]> => {
  return new Promise((resolve, reject) => {
    window.gapi.client.drive.files.list(params).then((response) => {
      const files = response.result.files
        .map(f => new File(f))
        .sort(foldersFirts);

      resolve(files);
    }).catch(async (error) => {
      handleError('getGDList', error);
      // reject(error);
    });
  });
};
