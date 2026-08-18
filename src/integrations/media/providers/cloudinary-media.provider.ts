import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Readable } from 'stream';
import {
  MediaStorageProvider,
  MediaUploadOptions,
  MediaUploadResult,
  MediaResourceType,
} from '../interfaces/media-storage.interface';

@Injectable()
export class CloudinaryMediaProvider implements MediaStorageProvider {
  private readonly logger = new Logger(CloudinaryMediaProvider.name);

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('cloudinary.cloudName');
    const apiKey = this.configService.get<string>('cloudinary.apiKey');
    const apiSecret = this.configService.get<string>('cloudinary.apiSecret');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.logger.log('Cloudinary SDK initialized successfully.');
    } else {
      this.logger.warn(
        'Cloudinary credentials are not fully configured. Media uploads to Cloudinary will fail if invoked.',
      );
    }
  }

  async upload(
    fileBuffer: Buffer,
    options: MediaUploadOptions,
  ): Promise<MediaUploadResult> {
    const cloudName = this.configService.get<string>('cloudinary.cloudName');
    const apiKey = this.configService.get<string>('cloudinary.apiKey');
    const apiSecret = this.configService.get<string>('cloudinary.apiSecret');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerErrorException(
        'Cloudinary storage provider is not properly configured.',
      );
    }

    const folder = options.folder ?? this.configService.get<string>('cloudinary.folder') ?? 'products';
    const resourceType = options.resourceType ?? MediaResourceType.AUTO;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: options.publicId,
          resource_type: resourceType,
          tags: options.tags,
        },
        (
          error?: UploadApiErrorResponse,
          result?: UploadApiResponse,
        ) => {
          if (error || !result) {
            this.logger.error('Cloudinary upload error:', error?.message ?? 'Unknown upload error');
            return reject(
              new InternalServerErrorException(
                `Failed to upload media file to Cloudinary: ${error?.message || 'Upload error'}`,
              ),
            );
          }

          resolve({
            publicId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
            format: result.format,
            resourceType: result.resource_type as MediaResourceType,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
          });
        },
      );

      const readableStream = new Readable();
      readableStream.push(fileBuffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  async delete(
    publicId: string,
    resourceType: MediaResourceType = MediaResourceType.IMAGE,
  ): Promise<void> {
    if (!publicId) {
      return;
    }

    try {
      const resType = resourceType === MediaResourceType.VIDEO ? 'video' : 'image';
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resType,
        invalidate: true,
      });

      if (result.result === 'ok' || result.result === 'not_found') {
        this.logger.log(`Cloudinary asset '${publicId}' deleted/verified (result: ${result.result}).`);
      } else {
        this.logger.warn(`Cloudinary destroy returned result: ${result.result} for asset '${publicId}'.`);
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to delete Cloudinary asset '${publicId}': ${error?.message || error}`,
      );
      // We do not rethrow error on deletion to maintain idempotency and allow caller DB/workflow to proceed smoothly,
      // but we log full diagnostic details.
    }
  }
}
