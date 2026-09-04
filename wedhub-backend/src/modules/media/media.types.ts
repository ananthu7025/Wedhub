export type MediaType = "LOGO" | "COVER" | "PORTFOLIO" | "VIDEO" | "STORE_ITEM_PHOTO";

export interface CreateUploadRequestInput {
  mediaType: MediaType;
  albumId: string | undefined;
  filename: string;
  mimeType: string;
  fileSize: number;
}

export interface UpdateMediaInput {
  altText: string | undefined;
  sortOrder: number | undefined;
  albumId: string | null | undefined;
}
