import { registerAs } from '@nestjs/config';

export default registerAs('cloudinary', () => ({
  cloudName: (process.env.CLOUDINARY_CLOUD_NAME ?? '').trim(),
  apiKey: (process.env.CLOUDINARY_API_KEY ?? '').trim(),
  apiSecret: (process.env.CLOUDINARY_API_SECRET ?? '').trim(),
  folder: (process.env.CLOUDINARY_FOLDER ?? 'products').trim(),
  imageMaxSize: parseInt(
    process.env.MEDIA_IMAGE_MAX_SIZE_BYTES ?? '5242880',
    10,
  ), // 5MB default
  videoMaxSize: parseInt(
    process.env.MEDIA_VIDEO_MAX_SIZE_BYTES ?? '52428800',
    10,
  ), // 50MB default
}));
