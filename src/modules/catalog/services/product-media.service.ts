import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { ProductMedia, MediaType } from '../entities/product-media.entity';
import { Product } from '../entities/product.entity';
import {
  MEDIA_STORAGE_PROVIDER,
  type MediaStorageProvider,
  MediaResourceType,
} from '../../../integrations/media/interfaces/media-storage.interface';
import { SlugService } from './slug.service';
import { MediaFileValidator } from '../validators/media-file.validator';
import { UploadProductMediaDto } from '../dto/media/upload-product-media.dto';
import { ProductMediaResponseDto } from '../dto/media/product-media-response.dto';

@Injectable()
export class ProductMediaService {
  private readonly logger = new Logger(ProductMediaService.name);

  constructor(
    @InjectRepository(ProductMedia)
    private readonly productMediaRepository: Repository<ProductMedia>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @Inject(MEDIA_STORAGE_PROVIDER)
    private readonly storageProvider: MediaStorageProvider,
    private readonly slugService: SlugService,
    private readonly mediaFileValidator: MediaFileValidator,
  ) {}

  async uploadMedia(
    productId: string,
    file: Express.Multer.File,
    dto: UploadProductMediaDto,
  ): Promise<ProductMediaResponseDto> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${productId}' not found.`);
    }

    const validatedFile = this.mediaFileValidator.validate(file, dto.type);

    const resourceType =
      validatedFile.detectedType === MediaType.VIDEO
        ? MediaResourceType.VIDEO
        : MediaResourceType.IMAGE;

    const folder = `products/${productId}`;

    const uploadResult = await this.storageProvider.upload(
      validatedFile.buffer,
      {
        folder,
        resourceType,
      },
    );

    const mediaSlug = await this.slugService.generateUniqueSlug(
      `prod-media-${productId.slice(0, 8)}-${randomUUID().slice(0, 8)}`,
      async (slugToCheck) => {
        const existing = await this.productMediaRepository.findOne({
          where: { slug: slugToCheck },
        });
        return !!existing;
      },
    );

    const media = this.productMediaRepository.create({
      url: uploadResult.secureUrl,
      publicId: uploadResult.publicId,
      slug: mediaSlug,
      type: validatedFile.detectedType,
      altText: dto.altText,
      displayOrder: dto.displayOrder ?? 0,
      isActive: true,
      product: { id: productId } as Product,
    });

    let savedMedia: ProductMedia;
    try {
      savedMedia = await this.productMediaRepository.save(media);
    } catch (err: any) {
      this.logger.error(
        `Database save failed for uploaded product media. Executing compensating Cloudinary delete for asset '${uploadResult.publicId}'...`,
        err?.stack,
      );
      await this.storageProvider.delete(uploadResult.publicId, resourceType);
      throw new InternalServerErrorException(
        'Failed to persist product media record in database.',
      );
    }

    return this.mapToResponseDto(savedMedia, productId);
  }

  async deleteMedia(productId: string, mediaId: string): Promise<void> {
    const media = await this.productMediaRepository.findOne({
      where: {
        id: mediaId,
        product: { id: productId },
      },
    });

    if (!media) {
      throw new NotFoundException(
        `Product media with ID '${mediaId}' not found for product '${productId}'.`,
      );
    }

    // Step 1: Cloudinary delete (idempotent, logs warning on non-fatal error)
    if (media.publicId) {
      const resourceType =
        media.type === MediaType.VIDEO
          ? MediaResourceType.VIDEO
          : MediaResourceType.IMAGE;

      await this.storageProvider.delete(media.publicId, resourceType);
    }

    // Step 2: Delete DB record
    await this.productMediaRepository.remove(media);
  }

  async getProductMedia(productId: string): Promise<ProductMediaResponseDto[]> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${productId}' not found.`);
    }

    const mediaList = await this.productMediaRepository.find({
      where: {
        product: { id: productId },
        isActive: true,
      },
      order: {
        displayOrder: 'ASC',
        createdAt: 'ASC',
      },
    });

    return mediaList.map((m) => this.mapToResponseDto(m, productId));
  }

  private mapToResponseDto(
    media: ProductMedia,
    productId: string,
  ): ProductMediaResponseDto {
    return {
      id: media.id,
      productId: media.product?.id || productId,
      url: media.url,
      slug: media.slug,
      type: media.type,
      altText: media.altText,
      displayOrder: media.displayOrder,
      isActive: media.isActive,
      createdAt: media.createdAt,
      updatedAt: media.updatedAt,
    };
  }
}
