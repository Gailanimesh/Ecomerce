import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaType } from '../entities/product-media.entity';

export interface ValidatedMediaFile {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
  detectedType: MediaType;
}

@Injectable()
export class MediaFileValidator {
  private readonly allowedImageMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  private readonly allowedVideoMimeTypes = [
    'video/mp4',
    'video/webm',
  ];

  constructor(private readonly configService: ConfigService) {}

  validate(
    file: Express.Multer.File | undefined,
    requestedType?: MediaType,
  ): ValidatedMediaFile {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Media file is required and cannot be empty.');
    }

    const mimeType = (file.mimetype || '').toLowerCase();
    const isImage = this.allowedImageMimeTypes.includes(mimeType);
    const isVideo = this.allowedVideoMimeTypes.includes(mimeType);

    if (!isImage && !isVideo) {
      throw new BadRequestException(
        `Unsupported media format '${file.mimetype}'. Allowed formats: JPEG, PNG, WebP, MP4, WebM.`,
      );
    }

    const detectedType = isVideo ? MediaType.VIDEO : MediaType.IMAGE;

    if (requestedType && requestedType !== detectedType) {
      throw new BadRequestException(
        `MIME type '${file.mimetype}' does not match requested media type '${requestedType}'.`,
      );
    }

    const imageMaxSize = this.configService.get<number>(
      'cloudinary.imageMaxSize',
      5242880, // 5MB
    );
    const videoMaxSize = this.configService.get<number>(
      'cloudinary.videoMaxSize',
      52428800, // 50MB
    );

    const maxAllowedSize = detectedType === MediaType.VIDEO ? videoMaxSize : imageMaxSize;

    if (file.size > maxAllowedSize) {
      const maxMb = (maxAllowedSize / (1024 * 1024)).toFixed(1);
      throw new BadRequestException(
        `File size (${(file.size / (1024 * 1024)).toFixed(
          2,
        )} MB) exceeds maximum allowed limit of ${maxMb} MB for ${detectedType.toLowerCase()}s.`,
      );
    }

    return {
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType,
      size: file.size,
      detectedType,
    };
  }
}
