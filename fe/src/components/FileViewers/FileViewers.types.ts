import { ReactElement } from "react";

export enum ViewerType {
  TEXT = "text",
  IMAGE = "image",
  PDF = "pdf",
  GOOGLE_DRIVE_LINK = "googleDriveLink",
  PASSWORD = "password",
  UNKNOWN = "unknown",
}

export const editorNameByType: Record<ViewerType, string> = {
  [ViewerType.TEXT]: "Text Editor",
  [ViewerType.IMAGE]: "Image Viewer",
  [ViewerType.PDF]: "PDF Viewer",
  [ViewerType.GOOGLE_DRIVE_LINK]: "Google Drive Viewer",
  [ViewerType.PASSWORD]: "Password Editor",
  [ViewerType.UNKNOWN]: "Unknown Viewer",
};

export enum MessageType {
  INFO = "info",
  SUCCESS = "success",
  ERROR = "error",
  WARNING = "warning",
  STATUS = "status",
}

export type EditorMessageType = { type: MessageType, title: any, messageContent?: ReactElement };
