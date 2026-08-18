export const MEDIA_STORAGE_PROVIDER = 'MEDIA_STORAGE_PROVIDER';

export enum MediaResourceType {
  IMAGE = 'image',
  VIDEO = 'video',
  RAW = 'raw',
  AUTO = 'auto',
}

export interface MediaUploadOptions {
  folder?: string;
  publicId?: string;
  resourceType?: MediaResourceType;
  tags?: string[];
}

export interface MediaUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  format: string;
  resourceType: MediaResourceType;
  width?: number;
  height?: number;
  bytes?: number;
}

export interface MediaStorageProvider {
  upload(
    fileBuffer: Buffer,
    options: MediaUploadOptions,
  ): Promise<MediaUploadResult>;

  delete(
    publicId: string,
    resourceType?: MediaResourceType,
  ): Promise<void>;
}
