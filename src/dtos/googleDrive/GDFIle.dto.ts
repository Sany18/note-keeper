export class GDFileDto {
  id: string;
  name: string;
  mimeType: string;
  parents: string[];
  modifiedTime: string;
  createdTime: string;
  webViewLink: string;
  iconLink: string;
  thumbnailLink: string;
  content: string;
  capabilities: { [key: string]: boolean };

  constructor(data: Partial<GDFileDto>) {
    this.id = data?.id;
    this.name = data?.name;
    this.mimeType = data?.mimeType;
    this.parents = data?.parents;
    this.modifiedTime = data?.modifiedTime;
    this.createdTime = data?.createdTime;
    this.webViewLink = data?.webViewLink;
    this.iconLink = data?.iconLink;
    this.thumbnailLink = data?.thumbnailLink;
    this.content = data?.content;
    this.capabilities = data?.capabilities;
  }
};
