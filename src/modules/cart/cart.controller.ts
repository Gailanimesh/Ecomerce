import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
} from '@nestjs/swagger';

import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartResponseDto } from './dto/cart-response.dto';
import { CheckoutPreparationDto } from './dto/checkout-preparation.dto';
import { ApplyCouponDto } from '../coupons/dto/apply-coupon.dto';
import { CartCouponPreviewDto } from '../coupons/dto/coupon-response.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @ApiOperation({
    summary: 'Get active cart for current user',
    description:
      'Retrieves or creates the single active cart for the authenticated user, including enriched item details, subtotal summary, and live inventory validation warnings.',
  })
  @ApiOkResponse({
    type: CartResponseDto,
    description: 'Active cart retrieved successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @Get()
  getCart(@CurrentUser() user: AuthenticatedUser): Promise<CartResponseDto> {
    return this.cartService.getCart(user.id);
  }

  @ApiOperation({
    summary: 'Add item to active cart',
    description:
      'Adds a product variant to the cart or increases quantity if variant already exists. Validates product active status and available inventory stock.',
  })
  @ApiCreatedResponse({
    type: CartResponseDto,
    description: 'Item added to cart successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Validation failure (e.g. quantity < 1, stock exceeded, product inactive).',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiNotFoundResponse({
    description: 'Product variant or inventory not found.',
  })
  @Post('items')
  addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddCartItemDto,
  ): Promise<CartResponseDto> {
    return this.cartService.addItem(user.id, dto);
  }

  @ApiOperation({
    summary: 'Update cart item quantity',
    description:
      'Updates quantity of a specific cart item. Setting quantity to 0 removes the item from the cart. Enforces cart item ownership.',
  })
  @ApiParam({
    name: 'itemId',
    description: 'Cart item unique identifier (UUID)',
    example: 'c1a2b3c4-d5e6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    type: CartResponseDto,
    description: 'Cart item quantity updated successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid quantity (e.g. negative quantity or stock limit exceeded).',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Item does not belong to user cart.',
  })
  @ApiNotFoundResponse({
    description: 'Cart item not found.',
  })
  @Patch('items/:itemId')
  updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    return this.cartService.updateItem(user.id, itemId, dto);
  }

  @ApiOperation({
    summary: 'Remove cart item',
    description: 'Deletes a specific item from the active cart. Enforces item ownership.',
  })
  @ApiParam({
    name: 'itemId',
    description: 'Cart item unique identifier (UUID)',
    example: 'c1a2b3c4-d5e6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    type: CartResponseDto,
    description: 'Cart item removed successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Item does not belong to user cart.',
  })
  @ApiNotFoundResponse({
    description: 'Cart item not found.',
  })
  @Delete('items/:itemId')
  removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
  ): Promise<CartResponseDto> {
    return this.cartService.removeItem(user.id, itemId);
  }

  @ApiOperation({
    summary: 'Clear all cart items',
    description: 'Removes all items from the authenticated user active cart.',
  })
  @ApiOkResponse({
    type: CartResponseDto,
    description: 'Cart cleared successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @Delete()
  clearCart(@CurrentUser() user: AuthenticatedUser): Promise<CartResponseDto> {
    return this.cartService.clearCart(user.id);
  }

  @ApiOperation({
    summary: 'Preview coupon discount on active cart',
    description:
      'Validates a coupon code against current active cart items and calculates authoritative preview discount. Note: This preview does not consume the coupon; checkout re-evaluates the coupon before order creation.',
  })
  @ApiOkResponse({
    type: CartCouponPreviewDto,
    description: 'Coupon preview calculation retrieved successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Coupon is inactive, expired, not yet valid, usage limit reached, or cart does not meet minimum order requirement.',
  })
  @ApiNotFoundResponse({
    description: 'Coupon code does not exist.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @Post('coupon')
  previewCoupon(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ApplyCouponDto,
  ): Promise<CartCouponPreviewDto> {
    return this.cartService.previewCoupon(user.id, dto.code);
  }

  @ApiOperation({
    summary: 'Remove coupon preview from cart',
    description: 'Clears any applied coupon preview and returns fresh cart totals.',
  })
  @ApiOkResponse({
    type: CartResponseDto,
    description: 'Cart details without coupon retrieved successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @Delete('coupon')
  removeCouponPreview(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CartResponseDto> {
    return this.cartService.removeCouponPreview(user.id);
  }

  @ApiOperation({
    summary: 'Prepare cart for checkout',
    description:
      'Formal contract endpoint for checkout preparation. Evaluates checkout readiness, totals, warnings, and item breakdown for order creation.',
  })
  @ApiOkResponse({
    type: CheckoutPreparationDto,
    description: 'Checkout preparation contract details retrieved successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @Get('checkout-prep')
  prepareCheckout(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CheckoutPreparationDto> {
    return this.cartService.prepareCheckout(user.id);
  }
}
