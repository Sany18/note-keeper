import { MimeTypesEnum } from "const/mimeTypes/mimeTypes.const";

export class GDPickerFileDto {
  description: string;
  embedUrl: string;
  iconUrl: string;
  id: string;
  lastEditedUtc: number;
  mimeType: string;
  name: string;
  parentId: string;
  serviceId: string;
  sizeBytes: number;
  type: string;
  url: string;

  constructor(data: Partial<GDPickerFileDto>) {
    this.description = data?.description;
    this.embedUrl = data?.embedUrl;
    this.iconUrl = data?.iconUrl;
    this.id = data?.id;
    this.lastEditedUtc = data?.lastEditedUtc;
    this.mimeType = data?.mimeType;
    this.name = data?.name;
    this.parentId = data?.parentId;
    this.serviceId = data?.serviceId;
    this.sizeBytes = data?.sizeBytes;
    this.type = data?.type;
    this.url = data?.url;
  }
};

// Model
export class GDPickerFile extends GDPickerFileDto {
  root?: boolean;
  selected?: boolean = false;
  children?: GDPickerFile[];
  isFolder: boolean = false;
  folderOpen?: boolean = false;

  constructor(data: Partial<GDPickerFile>) {
    super(data);

    this.root = data?.root;
    this.selected = data?.selected;
    this.children = data?.children?.map(child => new GDPickerFile(child));
    if (this.mimeType === MimeTypesEnum.Folder) this.isFolder = true;
    this.folderOpen = this.isFolder ? data?.folderOpen : undefined;
  }
}
