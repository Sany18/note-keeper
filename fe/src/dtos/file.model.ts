import { getFileFromNameExt } from "services/fileTypeConverter/getFileTypeFromName";

import { GDFileDto } from "./googleDrive/GDFIle.dto";
import { MimeTypesEnum } from "const/mimeTypes/mimeTypes.const";
import { RemoteStorageProviders } from "const/remoteStorageProviders/RemoteStorageProviders.enum";

export class File extends GDFileDto {
  root?: boolean;
  children?: File[];
  isFolder: boolean = false;
  selected?: boolean = false;
  draggable?: boolean = true;
  folderOpen?: boolean = false;
  title?: string; // For title html attribute
  extension?: string; // *.ext (*.pdf, *.docx, etc)
  provider?: RemoteStorageProviders;

  constructor(data: Partial<File> = {}) {
    super(data);

    this.root = data.root;
    this.children = data.children?.map(child => new File(child));
    this.isFolder = this.mimeType === MimeTypesEnum.Folder;
    this.selected = data.selected;
    this.draggable = data.draggable ?? true;
    this.folderOpen = this.isFolder ? data.folderOpen : undefined;
    this.title = data.title;
    this.extension = getFileFromNameExt(data.name || this.name) || data.extension;
    this.provider = data.provider;
  }
}
