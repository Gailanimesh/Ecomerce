import { Test, TestingModule } from '@nestjs/testing';
import { ProductMediaController } from './product-media.controller';
import { ProductMediaService } from '../services/product-media.service';
import { MediaType } from '../entities/product-media.entity';

describe('ProductMediaController', () => {
  let controller: ProductMediaController;
  let service: any;

  const mockResponse = {
    id: 'media-uuid-1',
    productId: 'prod-uuid-1',
    url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    slug: 'prod-media-sample',
    type: MediaType.IMAGE,
    altText: 'Sample Image',
    displayOrder: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    service = {
      uploadMedia: jest.fn().mockResolvedValue(mockResponse),
      deleteMedia: jest.fn().mockResolvedValue(undefined),
      getProductMedia: jest.fn().mockResolvedValue([mockResponse]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductMediaController],
      providers: [
        {
          provide: ProductMediaService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<ProductMediaController>(ProductMediaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadMedia', () => {
    it('should delegate upload to ProductMediaService', async () => {
      const mockFile = { fieldname: 'file' } as Express.Multer.File;
      const result = await controller.uploadMedia('prod-uuid-1', mockFile, {
        altText: 'Sample Image',
      });

      expect(service.uploadMedia).toHaveBeenCalledWith(
        'prod-uuid-1',
        mockFile,
        { altText: 'Sample Image' },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteMedia', () => {
    it('should delegate delete to ProductMediaService', async () => {
      await controller.deleteMedia('prod-uuid-1', 'media-uuid-1');

      expect(service.deleteMedia).toHaveBeenCalledWith(
        'prod-uuid-1',
        'media-uuid-1',
      );
    });
  });
});
