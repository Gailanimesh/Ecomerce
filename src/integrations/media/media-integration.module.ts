import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MEDIA_STORAGE_PROVIDER } from './interfaces/media-storage.interface';
import { CloudinaryMediaProvider } from './providers/cloudinary-media.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    CloudinaryMediaProvider,
    {
      provide: MEDIA_STORAGE_PROVIDER,
      useClass: CloudinaryMediaProvider,
    },
  ],
  exports: [MEDIA_STORAGE_PROVIDER, CloudinaryMediaProvider],
})
export class MediaIntegrationModule {}
