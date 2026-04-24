import { log } from "services/log/log.service";

type GetRevisionContentParams = {
  fileId: string;
  revisionId: string;
};

export const getGDRevisionContent = ({ handleError }) => (params: GetRevisionContentParams): Promise<string> => {
  return new Promise((resolve, reject) => {
    window.gapi.client.drive.revisions.get({
      fileId: params.fileId,
      revisionId: params.revisionId,
      alt: 'media',
    }).then((response) => {
      log.appEvent('Downloaded revision content from GD:', params.revisionId);
      resolve(response.body || '');
    }).catch((error) => {
      handleError('getGDRevisionContent', error);
      reject(error);
    });
  });
};
