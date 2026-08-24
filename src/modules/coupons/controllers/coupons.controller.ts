import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiQuery,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';

import { CouponsService } from '../services/coupons.service';
import { CreateCouponDto } from '../dto/create-coupon.dto';
import { UpdateCouponDto } from '../dto/update-coupon.dto';
import { CouponQueryDto } from '../dto/coupon-query.dto';
import {
  CouponResponseDto,
  PaginatedCouponsResponseDto,
  PaginatedCouponUsagesResponseDto,
} from '../dto/coupon-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RoleEnum } from '../../../common/enums/roles.enum';

@ApiTags('Admin Coupons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleEnum.ADMIN)
@Controller('admin/coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @ApiOperation({
    summary: 'Create a new coupon promotion',
    description:
      'Creates a new discount coupon with validation on discount rules, caps, minimum order amounts, and start/expiry windows. Requires ADMIN role.',
  })
  @ApiCreatedResponse({
    type: CouponResponseDto,
    description: 'Coupon created successfully.',
  })
  @ApiConflictResponse({
    description: 'Coupon with this code already exists.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid coupon payload or expiry date preceding start date.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Requires ADMIN role permission.',
  })
  @Post()
  createCoupon(@Body() dto: CreateCouponDto): Promise<CouponResponseDto> {
    return this.couponsService.createCoupon(dto);
  }

  @ApiOperation({
    summary: 'List all coupons with search & filtering',
    description:
      'Retrieves paginated coupons with optional search by code/description and filtering by active status or discount type. Requires ADMIN role.',
  })
  @ApiOkResponse({
    type: PaginatedCouponsResponseDto,
    description: 'Coupons retrieved successfully.',
  })
  @Get()
  getAllCoupons(@Query() query: CouponQueryDto): Promise<PaginatedCouponsResponseDto> {
    return this.couponsService.getAllCoupons(query);
  }

  @ApiOperation({
    summary: 'Get coupon details by ID',
    description: 'Retrieves a single coupon by its UUID. Requires ADMIN role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Coupon UUID.',
    example: '8f1bae24-53f7-4fbc-ac72-d67385125cf6',
  })
  @ApiOkResponse({
    type: CouponResponseDto,
    description: 'Coupon retrieved successfully.',
  })
  @ApiNotFoundResponse({
    description: 'Coupon not found.',
  })
  @Get(':id')
  getCouponById(@Param('id') id: string): Promise<CouponResponseDto> {
    return this.couponsService.getCouponById(id);
  }

  @ApiOperation({
    summary: 'Update coupon promotion rules',
    description:
      'Updates administrative properties (description, max discount, minimum order, date windows, limits, active status) of an existing coupon. Requires ADMIN role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Coupon UUID.',
    example: '8f1bae24-53f7-4fbc-ac72-d67385125cf6',
  })
  @ApiOkResponse({
    type: CouponResponseDto,
    description: 'Coupon updated successfully.',
  })
  @ApiNotFoundResponse({
    description: 'Coupon not found.',
  })
  @Patch(':id')
  updateCoupon(
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
  ): Promise<CouponResponseDto> {
    return this.couponsService.updateCoupon(id, dto);
  }

  @ApiOperation({
    summary: 'Activate coupon',
    description: 'Marks a coupon as active and available for redemption. Requires ADMIN role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Coupon UUID.',
    example: '8f1bae24-53f7-4fbc-ac72-d67385125cf6',
  })
  @ApiOkResponse({
    type: CouponResponseDto,
    description: 'Coupon activated successfully.',
  })
  @Patch(':id/activate')
  activateCoupon(@Param('id') id: string): Promise<CouponResponseDto> {
    return this.couponsService.activateCoupon(id);
  }

  @ApiOperation({
    summary: 'Deactivate coupon',
    description:
      'Deactivates a coupon so customers can no longer apply or redeem it. Requires ADMIN role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Coupon UUID.',
    example: '8f1bae24-53f7-4fbc-ac72-d67385125cf6',
  })
  @ApiOkResponse({
    type: CouponResponseDto,
    description: 'Coupon deactivated successfully.',
  })
  @Patch(':id/deactivate')
  deactivateCoupon(@Param('id') id: string): Promise<CouponResponseDto> {
    return this.couponsService.deactivateCoupon(id);
  }

  @ApiOperation({
    summary: 'Delete coupon',
    description:
      'Permanently deletes a coupon if it has never been used. If the coupon has historical usage records, deletion is rejected (use deactivate instead). Requires ADMIN role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Coupon UUID.',
    example: '8f1bae24-53f7-4fbc-ac72-d67385125cf6',
  })
  @ApiNoContentResponse({
    description: 'Coupon deleted successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Coupon has historical usages and cannot be deleted.',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  deleteCoupon(@Param('id') id: string): Promise<void> {
    return this.couponsService.deleteCoupon(id);
  }

  @ApiOperation({
    summary: 'Get coupon usage audit history',
    description:
      'Retrieves the list of customer orders where this coupon was successfully redeemed with discount amounts. Requires ADMIN role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Coupon UUID.',
    example: '8f1bae24-53f7-4fbc-ac72-d67385125cf6',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 10,
  })
  @ApiOkResponse({
    type: PaginatedCouponUsagesResponseDto,
    description: 'Usage audit history retrieved successfully.',
  })
  @Get(':id/usage')
  getCouponUsageHistory(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedCouponUsagesResponseDto> {
    return this.couponsService.getCouponUsageHistory(id, page, limit);
  }
}
