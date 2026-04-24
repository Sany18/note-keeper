import { fileSize } from "services/fileSize/fileSize";

export class GDStorageQuotaDto {
  limit: number;
  usage: number;
  usageInDrive: number;
  usageInDriveTrash: number

  constructor(data: Partial<GDStorageQuotaDto>) {
    this.limit = +data?.limit;
    this.usage = +data?.usage;
    this.usageInDrive = +data?.usageInDrive;
    this.usageInDriveTrash = +data?.usageInDriveTrash;
  }
};

// Model
export class GDStorageQuota extends GDStorageQuotaDto {
  limitStr: string;
  usageStr: string;
  usageInDriveStr: string;
  usageInDriveTrashStr: string;

  usagePercent: string;
  usageInDrivePercent: string;
  usageInDriveTrashPercent: string;

  constructor(data: Partial<GDStorageQuotaDto>) {
    super(data);

    this.limitStr = fileSize(this.limit);
    this.usageStr = fileSize(this.usage);
    this.usageInDriveStr = fileSize(this.usageInDrive);
    this.usageInDriveTrashStr = fileSize(this.usageInDriveTrash);

    this.usagePercent = (this.usage / this.limit * 100).toFixed(1);
    this.usageInDrivePercent = (this.usageInDrive / this.limit * 100).toFixed(1);
    this.usageInDriveTrashPercent = (this.usageInDriveTrash / this.limit * 100).toFixed(1);
  }
}
