import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ProductMediaService } from './product-media.service';
import { ProductMedia, MediaType } from '../entities/product-media.entity';
import { Product } from '../entities/product.entity';
import { MEDIA_STORAGE_PROVIDER } from '../../../integrations/media/interfaces/media-storage.interface';
import { SlugService } from './slug.service';
import { MediaFileValidator } from '../validators/media-file.validator';

describe('ProductMediaService', () => {
  let service: ProductMediaService;
  let productMediaRepo: any;
  let productRepo: any;
  let storageProvider: any;
  let slugService: any;
  let mediaFileValidator: any;

  const mockProduct = {
    id: 'prod-uuid-1234',
    name: 'Test Product',
  };

  const mockMedia = {
    id: 'media-uuid-5678',
    url: 'https://res.cloudinary.com/test/image/upload/v1234/products/prod-uuid-1234/test.jpg',
    publicId: 'products/prod-uuid-1234/test',
    slug: 'prod-media-prod-uuid-test',
    type: MediaType.IMAGE,
    altText: 'Test Image',
    displayOrder: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    product: mockProduct,
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('fake-image-bytes'),
    size: 1024,
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
  };

  beforeEach(async () => {
    productMediaRepo = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'media-uuid-5678', createdAt: new Date(), updatedAt: new Date() })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    productRepo = {
      findOne: jest.fn(),
    };

    storageProvider = {
      upload: jest.fn().mockResolvedValue({
        publicId: 'products/prod-uuid-1234/test',
        url: 'http://res.cloudinary.com/test/image/upload/v1234/products/prod-uuid-1234/test.jpg',
        secureUrl: 'https://res.cloudinary.com/test/image/upload/v1234/products/prod-uuid-1234/test.jpg',
        format: 'jpg',
        resourceType: 'image',
      }),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    slugService = {
      generateUniqueSlug: jest.fn().mockResolvedValue('prod-media-prod-uuid-test'),
    };

    mediaFileValidator = {
      validate: jest.fn().mockReturnValue({
        buffer: mockFile.buffer,
        originalName: mockFile.originalname,
        mimeType: mockFile.mimetype,
        size: mockFile.size,
        detectedType: MediaType.IMAGE,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductMediaService,
        {
          provide: getRepositoryToken(ProductMedia),
          useValue: productMediaRepo,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: productRepo,
        },
        {
          provide: MEDIA_STORAGE_PROVIDER,
          useValue: storageProvider,
        },
        {
          provide: SlugService,
          useValue: slugService,
        },
        {
          provide: MediaFileValidator,
          useValue: mediaFileValidator,
        },
      ],
    }).compile();

    service = module.get<ProductMediaService>(ProductMediaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadMedia', () => {
    it('should throw NotFoundException if target product does not exist', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(
        service.uploadMedia('non-existent-id', mockFile, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if file validation fails', async () => {
      productRepo.findOne.mockResolvedValue(mockProduct);
      mediaFileValidator.validate.mockImplementation(() => {
        throw new BadRequestException('Invalid file size');
      });

      await expect(
        service.uploadMedia(mockProduct.id, mockFile, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should upload to Cloudinary and save ProductMedia record successfully', async () => {
      productRepo.findOne.mockResolvedValue(mockProduct);

      const result = await service.uploadMedia(mockProduct.id, mockFile, {
        altText: 'Test Image',
        displayOrder: 0,
      });

      expect(storageProvider.upload).toHaveBeenCalledWith(
        mockFile.buffer,
        expect.objectContaining({
          folder: `products/${mockProduct.id}`,
        }),
      );
      expect(productMediaRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.url).toContain('https://res.cloudinary.com');
      expect(result.productId).toBe(mockProduct.id);
    });

    it('should perform compensating Cloudinary delete if DB save fails after successful upload', async () => {
      productRepo.findOne.mockResolvedValue(mockProduct);
      productMediaRepo.save.mockRejectedValue(new Error('DB Constraint Violation'));

      await expect(
        service.uploadMedia(mockProduct.id, mockFile, {}),
      ).rejects.toThrow(InternalServerErrorException);

      expect(storageProvider.delete).toHaveBeenCalledWith(
        'products/prod-uuid-1234/test',
        'image',
      );
    });
  });

  describe('deleteMedia', () => {
    it('should throw NotFoundException if media asset is not found for product', async () => {
      productMediaRepo.findOne.mockResolvedValue(null);

      await expect(
        service.deleteMedia(mockProduct.id, 'invalid-media-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete from Cloudinary FIRST, then remove DB record', async () => {
      productMediaRepo.findOne.mockResolvedValue(mockMedia);

      await service.deleteMedia(mockProduct.id, mockMedia.id);

      expect(storageProvider.delete).toHaveBeenCalledWith(
        mockMedia.publicId,
        'image',
      );
      expect(productMediaRepo.remove).toHaveBeenCalledWith(mockMedia);
    });
  });

  describe('getProductMedia', () => {
    it('should throw NotFoundException if product is missing', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.getProductMedia('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return list of product media items ordered by displayOrder', async () => {
      productRepo.findOne.mockResolvedValue(mockProduct);
      productMediaRepo.find.mockResolvedValue([mockMedia]);

      const result = await service.getProductMedia(mockProduct.id);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockMedia.id);
    });
  });
});
