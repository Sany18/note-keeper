import { log } from "services/log/log.service";
import { fileToGDBase64 } from "services/urlToBase64/urlToBase64";

import { fieldsArray } from "../../../const/remoteStorageProviders/googleDrive/gapi.parameters";
import { MimeTypesEnum } from "const/mimeTypes/mimeTypes.const";

export const uploadFiles = ({ handleError }) => (file: File, parents: string[]): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    const metadata = {
      name: file.name,
      mimeType: MimeTypesEnum[file.type],
      parents,
    };

    // Construct the multipart request body
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const base64Data = await fileToGDBase64(file);
    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: ' + file.type + '\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      base64Data +
      closeDelimiter;

    // Make the request
    window.gapi.client.request({
      path: 'https://www.googleapis.com/upload/drive/v3/files',
      method: 'POST',
      params: {
        uploadType: 'multipart',
        fields: fieldsArray.join(','),
      },
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }).then((response) => {
      log.success('File uploaded successfully!', response.result);
      resolve(response);
    }).catch((error) => {
      log.error('Error uploading file:', error);
      reject(error);
    });
  });
};
