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
} from '@nestjs/swagger';

import { OrdersService } from './services/orders.service';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import {
  OrderResponseDto,
  CheckoutResponseDto,
  PaginatedOrdersResponseDto,
} from './dto/order-response.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { RoleEnum } from '../../common/enums/roles.enum';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({
    summary: 'Checkout active cart to create order',
    description: `Executes a single database transaction checkout using the authenticated user's active cart.
    
**Sequence Flow**:
1. Validate User & Active Cart
2. Validate Delivery Address Ownership
3. Validate Product & Variant Active Status
4. Compute Order Totals using DB prices
5. Reserve Inventory with Pessimistic Row Locks (pessimistic_write)
6. Generate Unique Order Number (e.g. ORD-20260801-A7F9B2)
7. Create Order & OrderItem Snapshots
8. Log Initial Audit Entry in OrderHistory (PENDING_PAYMENT, CHECKOUT_CREATED)
9. Clear Active Cart Items
10. Commit Transaction & Return Response`,
  })
  @ApiCreatedResponse({
    type: CheckoutResponseDto,
    description: 'Order created successfully from active cart.',
  })
  @ApiBadRequestResponse({
    description:
      'Active cart is empty, products/variants are inactive, or insufficient inventory stock.',
  })
  @ApiNotFoundResponse({
    description: 'Address ID not found or does not belong to current user.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  checkout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckoutDto,
  ): Promise<CheckoutResponseDto> {
    return this.ordersService.checkout(user.id, dto);
  }

  @ApiOperation({
    summary: 'Get paginated order history for current user',
    description:
      'Retrieves lightweight summary records of past orders placed by the authenticated customer.',
  })
  @ApiOkResponse({
    type: PaginatedOrdersResponseDto,
    description: 'Customer orders retrieved successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @UseGuards(JwtAuthGuard)
  @Get()
  getUserOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: OrderQueryDto,
  ): Promise<PaginatedOrdersResponseDto> {
    return this.ordersService.getUserOrders(user.id, query);
  }

  @ApiOperation({
    summary: 'Get detailed order by ID or order number (Customer)',
    description:
      'Retrieves complete order details including item snapshots, delivery address, and status audit timeline for an order owned by the user.',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal Order UUID or Customer-facing Order Number.',
    example: 'ORD-20260801-102938',
  })
  @ApiOkResponse({
    type: OrderResponseDto,
    description: 'Order details retrieved successfully.',
  })
  @ApiNotFoundResponse({
    description: 'Order not found for current user.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getUserOrderById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.getUserOrderById(user.id, id);
  }

  @ApiOperation({
    summary: 'Cancel order (Customer)',
    description:
      'Allows customer to cancel their order if currently in PENDING_PAYMENT or CONFIRMED status. Releases reserved inventory back to available stock.',
  })
  @ApiParam({
    name: 'id',
    description: 'Order UUID to cancel.',
  })
  @ApiOkResponse({
    type: OrderResponseDto,
    description: 'Order cancelled successfully.',
  })
  @ApiForbiddenResponse({
    description:
      'Order is in PROCESSING, SHIPPED, or DELIVERED status and cannot be cancelled by customer.',
  })
  @ApiNotFoundResponse({
    description: 'Order not found.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @UseGuards(JwtAuthGuard)
  @Post(':id/cancel')
  cancelOwnOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.cancelOwnOrder(user.id, id);
  }

  @ApiOperation({
    summary: 'Search and filter all orders across system (Admin)',
    description:
      'Admin search API supporting pagination, multi-field search (Order Number, Customer Name, Recipient Name, Recipient Phone, Product Name, SKU), status filtering, payment method filtering, and date range filtering.',
  })
  @ApiOkResponse({
    type: PaginatedOrdersResponseDto,
    description: 'Admin order search results retrieved successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer JWT access token.',
  })
  @ApiForbiddenResponse({
    description: 'Requires ADMIN role permission.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @Get('admin/all')
  getAllOrders(
    @Query() query: OrderQueryDto,
  ): Promise<PaginatedOrdersResponseDto> {
    return this.ordersService.getAllOrders(query);
  }

  @ApiOperation({
    summary: 'Get full order details with audit timeline (Admin)',
    description:
      'Retrieves full order record, items, user details, payment state, and complete OrderHistory audit log for admin review.',
  })
  @ApiParam({
    name: 'id',
    description: 'Order UUID or Order Number.',
  })
  @ApiOkResponse({
    type: OrderResponseDto,
    description: 'Admin order details retrieved successfully.',
  })
  @ApiNotFoundResponse({
    description: 'Order not found.',
  })
  @ApiForbiddenResponse({
    description: 'Requires ADMIN role permission.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @Get('admin/:id')
  getAdminOrderById(@Param('id') id: string): Promise<OrderResponseDto> {
    return this.ordersService.getAdminOrderById(id);
  }

  @ApiOperation({
    summary: 'Update order lifecycle status (Admin)',
    description: `Updates order status and manages inventory commitment/release automatically.
    
**Allowed Transitions (VALID_TRANSITIONS Matrix)**:
- PENDING_PAYMENT -> CONFIRMED | FAILED | CANCELLED
- CONFIRMED -> PROCESSING | CANCELLED
- PROCESSING -> SHIPPED | CANCELLED
- SHIPPED -> DELIVERED
- DELIVERED -> COMPLETED`,
  })
  @ApiParam({
    name: 'id',
    description: 'Order UUID.',
  })
  @ApiOkResponse({
    type: OrderResponseDto,
    description: 'Order status updated successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid status transition according to state machine matrix.',
  })
  @ApiNotFoundResponse({
    description: 'Order not found.',
  })
  @ApiForbiddenResponse({
    description: 'Requires ADMIN role permission.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN)
  @Patch('admin/:id/status')
  updateOrderStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.updateOrderStatus(id, dto, user.id, 'ADMIN');
  }
}
