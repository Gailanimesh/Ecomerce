import { Test, TestingModule } from '@nestjs/testing';

jest.mock('./services/category.service', () => ({
  CategoryService: class {},
}));
jest.mock('./services/brand.service', () => ({
  BrandService: class {},
}));
jest.mock('./services/product.service', () => ({
  ProductService: class {},
}));

import { CatalogController } from './catalog.controller';
import { CategoryService } from './services/category.service';
import { BrandService } from './services/brand.service';
import { ProductService } from './services/product.service';

describe('CatalogController', () => {
  let controller: CatalogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [
        {
          provide: CategoryService,
          useValue: {},
        },
        {
          provide: BrandService,
          useValue: {},
        },
        {
          provide: ProductService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<CatalogController>(CatalogController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
