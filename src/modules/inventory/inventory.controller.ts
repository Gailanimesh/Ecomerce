import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';

import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';
import { ReleaseReservationDto } from './dto/release-reservation.dto';
import { CommitReservationDto } from './dto/commit-reservation.dto';
import { UpdateThresholdDto } from './dto/update-threshold.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import {
  InventoryResponseDto,
  PaginatedInventoryResponseDto,
} from './dto/inventory-response.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/roles.enum';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleEnum.ADMIN)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @ApiOperation({
    summary: 'Create inventory record for a product variant',
    description: 'Initializes stock management for a specific ProductVariant. Requires ADMIN role.',
  })
  @ApiCreatedResponse({
    type: InventoryResponseDto,
    description: 'Inventory record created successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Validation failure on input fields or negative quantity.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Requires ADMIN role.',
  })
  @ApiNotFoundResponse({
    description: 'ProductVariant with specified ID not found.',
  })
  @ApiConflictResponse({
    description: 'Inventory record already exists for this ProductVariant.',
  })
  @Post()
  createInventory(@Body() dto: CreateInventoryDto) {
    return this.inventoryService.createInventory(dto);
  }

  @ApiOperation({
    summary: 'Get paginated list of inventory records',
    description: 'Retrieves a paginated list of stock records with SKU search, low stock/out of stock filtering, and sorting. Requires ADMIN role.',
  })
  @ApiOkResponse({
    type: PaginatedInventoryResponseDto,
    description: 'Paginated inventory list retrieved successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Requires ADMIN role.',
  })
  @Get()
  getInventoryList(@Query() query: InventoryQueryDto) {
    return this.inventoryService.getInventoryList(query);
  }

  @ApiOperation({
    summary: 'Get inventory record by ProductVariant ID',
    description: 'Retrieves stock and threshold details for a specific ProductVariant. Requires ADMIN role.',
  })
  @ApiParam({
    name: 'variantId',
    description: 'ProductVariant unique identifier (UUID)',
    example: 'd4e5f6a7-b890-12cd-ef34-567890123456',
  })
  @ApiOkResponse({
    type: InventoryResponseDto,
    description: 'Inventory details retrieved successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Requires ADMIN role.',
  })
  @ApiNotFoundResponse({
    description: 'Inventory record not found for variant.',
  })
  @Get(':variantId')
  getInventoryByVariantId(@Param('variantId') variantId: string) {
    return this.inventoryService.getInventoryByVariantId(variantId);
  }

  @ApiOperation({
    summary: 'Update inventory quantities and threshold',
    description: 'Directly updates available quantity, reserved quantity, or low stock threshold. Requires ADMIN role.',
  })
  @ApiParam({
    name: 'variantId',
    description: 'ProductVariant unique identifier (UUID)',
    example: 'd4e5f6a7-b890-12cd-ef34-567890123456',
  })
  @ApiOkResponse({
    type: InventoryResponseDto,
    description: 'Inventory updated successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Validation failure or negative quantity.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Requires ADMIN role.',
  })
  @ApiNotFoundResponse({
    description: 'Inventory record not found for variant.',
  })
  @Patch(':variantId')
  updateInventory(
    @Param('variantId') variantId: string,
    @Body() dto: UpdateInventoryDto,
  ) {
    return this.inventoryService.updateInventory(variantId, dto);
  }

  @ApiOperation({
    summary: 'Adjust available stock',
    description: 'Increases or decreases available stock quantity in a database transaction. Prevents stock from becoming negative. Requires ADMIN role.',
  })
  @ApiParam({
    name: 'variantId',
    description: 'ProductVariant unique identifier (UUID)',
    example: 'd4e5f6a7-b890-12cd-ef34-567890123456',
  })
  @ApiOkResponse({
    type: InventoryResponseDto,
    description: 'Stock adjusted successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid adjustment type or insufficient stock for decrease.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Requires ADMIN role.',
  })
  @ApiNotFoundResponse({
    description: 'Inventory record not found for variant.',
  })
  @Patch(':variantId/adjust')
  adjustStock(
    @Param('variantId') variantId: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventoryService.adjustStock(variantId, dto);
  }

  @ApiOperation({
    summary: 'Update low stock threshold level',
    description: 'Updates low stock threshold trigger value for alert monitoring. Requires ADMIN role.',
  })
  @ApiParam({
    name: 'variantId',
    description: 'ProductVariant unique identifier (UUID)',
    example: 'd4e5f6a7-b890-12cd-ef34-567890123456',
  })
  @ApiOkResponse({
    type: InventoryResponseDto,
    description: 'Low stock threshold updated successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Negative threshold value.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Requires ADMIN role.',
  })
  @ApiNotFoundResponse({
    description: 'Inventory record not found for variant.',
  })
  @Patch(':variantId/threshold')
  updateThreshold(
    @Param('variantId') variantId: string,
    @Body() dto: UpdateThresholdDto,
  ) {
    return this.inventoryService.updateThreshold(variantId, dto);
  }

  @ApiOperation({
    summary: 'Reserve stock quantity',
    description: 'Deducts from available quantity and adds to reserved quantity. Requires ADMIN role.',
  })
  @ApiParam({
    name: 'variantId',
    description: 'ProductVariant unique identifier (UUID)',
    example: 'd4e5f6a7-b890-12cd-ef34-567890123456',
  })
  @ApiOkResponse({
    type: InventoryResponseDto,
    description: 'Stock reserved successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Insufficient available stock or invalid quantity.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Requires ADMIN role.',
  })
  @ApiNotFoundResponse({
    description: 'Inventory record not found for variant.',
  })
  @Patch(':variantId/reserve')
  reserveStock(
    @Param('variantId') variantId: string,
    @Body() dto: ReserveStockDto,
  ) {
    return this.inventoryService.reserveStock(variantId, dto.quantity);
  }

  @ApiOperation({
    summary: 'Release reserved stock quantity',
    description: 'Releases reserved stock back to available quantity. Requires ADMIN role.',
  })
  @ApiParam({
    name: 'variantId',
    description: 'ProductVariant unique identifier (UUID)',
    example: 'd4e5f6a7-b890-12cd-ef34-567890123456',
  })
  @ApiOkResponse({
    type: InventoryResponseDto,
    description: 'Reserved stock released successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Cannot release more than reserved quantity.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Requires ADMIN role.',
  })
  @ApiNotFoundResponse({
    description: 'Inventory record not found for variant.',
  })
  @Patch(':variantId/release')
  releaseReservation(
    @Param('variantId') variantId: string,
    @Body() dto: ReleaseReservationDto,
  ) {
    return this.inventoryService.releaseReservation(variantId, dto.quantity);
  }

  @ApiOperation({
    summary: 'Commit reserved stock quantity',
    description: 'Fulfills order reservation by deducting from reserved quantity. Requires ADMIN role.',
  })
  @ApiParam({
    name: 'variantId',
    description: 'ProductVariant unique identifier (UUID)',
    example: 'd4e5f6a7-b890-12cd-ef34-567890123456',
  })
  @ApiOkResponse({
    type: InventoryResponseDto,
    description: 'Reservation committed successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Cannot commit more than reserved quantity.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Requires ADMIN role.',
  })
  @ApiNotFoundResponse({
    description: 'Inventory record not found for variant.',
  })
  @Patch(':variantId/commit')
  commitReservation(
    @Param('variantId') variantId: string,
    @Body() dto: CommitReservationDto,
  ) {
    return this.inventoryService.commitReservation(variantId, dto.quantity);
  }
}
