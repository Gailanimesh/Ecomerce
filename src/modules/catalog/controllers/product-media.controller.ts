import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

import { ProductMediaService } from '../services/product-media.service';
import { UploadProductMediaDto } from '../dto/media/upload-product-media.dto';
import { ProductMediaResponseDto } from '../dto/media/product-media-response.dto';

import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RoleEnum } from '../../../common/enums/roles.enum';

@ApiTags('Catalog - Product Media')
@Controller(['catalog/products', 'products'])
export class ProductMediaController {
  constructor(private readonly productMediaService: ProductMediaService) {}

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upload media asset for product',
    description:
      'Uploads an image or video asset to Cloudinary CDN and associates metadata with specified product. Requires ADMIN role.',
  })
  @ApiParam({
    name: 'productId',
    description: 'Product unique identifier (UUID)',
    example: 'e5f6a7b8-9012-34cd-ef56-789012345678',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Multipart form payload containing binary media file and metadata',
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Binary media file (JPEG, PNG, WebP up to 5MB, or MP4, WebM up to 50MB)',
        },
        altText: {
          type: 'string',
          description: 'Accessibility and SEO alternative text',
          example: 'Nike Air Max black running shoe side view',
        },
        displayOrder: {
          type: 'integer',
          description: 'Display order priority (0 for primary thumbnail)',
          example: 0,
          default: 0,
        },
        type: {
          type: 'string',
          enum: ['IMAGE', 'VIDEO'],
          description: 'Explicit media type (IMAGE or VIDEO). Inferred from MIME type if omitted.',
          example: 'IMAGE',
        },
      },
    },
  })
  @ApiCreatedResponse({
    type: ProductMediaResponseDto,
    description: 'Product media asset uploaded and saved successfully.',
  })
  @ApiBadRequestResponse({
    description:
      'Validation failure (missing file, invalid file type, or file size exceeds limit).',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Requires ADMIN role.',
  })
  @ApiNotFoundResponse({
    description: 'Product with specified ID not found.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @Post(':productId/media')
  uploadMedia(
    @Param('productId') productId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadProductMediaDto,
  ) {
    return this.productMediaService.uploadMedia(productId, file, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete product media asset',
    description:
      'Deletes specified media asset from Cloudinary CDN and removes PostgreSQL metadata record. Requires ADMIN role.',
  })
  @ApiParam({
    name: 'productId',
    description: 'Product unique identifier (UUID)',
    example: 'e5f6a7b8-9012-34cd-ef56-789012345678',
  })
  @ApiParam({
    name: 'mediaId',
    description: 'Product media unique identifier (UUID)',
    example: 'c3d4e5f6-a7b8-9012-cdef-345678901234',
  })
  @ApiNoContentResponse({
    description: 'Product media asset deleted successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Requires ADMIN role.',
  })
  @ApiNotFoundResponse({
    description: 'Product or media record not found.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @Delete(':productId/media/:mediaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMedia(
    @Param('productId') productId: string,
    @Param('mediaId') mediaId: string,
  ) {
    return this.productMediaService.deleteMedia(productId, mediaId);
  }
}
