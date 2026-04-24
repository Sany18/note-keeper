import { log } from "services/log/log.service";

type GetRevisionListParams = {
  fileId: string;
};

export const getGDRevisions = ({ handleError }) => (params: GetRevisionListParams): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    window.gapi.client.drive.revisions.list({
      fileId: params.fileId,
      pageSize: 100,
      fields: "revisions(id,modifiedTime,keepForever,size,lastModifyingUser(displayName,emailAddress,photoLink))",
    }).then((response) => {
      const revisions = response?.result?.revisions || [];

      revisions.sort((a, b) => {
        const aTime = a?.modifiedTime ? new Date(a.modifiedTime).getTime() : 0;
        const bTime = b?.modifiedTime ? new Date(b.modifiedTime).getTime() : 0;

        return bTime - aTime;
      });

      log.appEvent('Downloaded revisions list from GD:', revisions.length);
      resolve(revisions);
    }).catch((error) => {
      handleError('getGDRevisions', error);
      reject(error);
    });
  });
};
