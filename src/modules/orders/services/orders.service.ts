import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';

import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderHistory } from '../entities/order-history.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { OrderNumberService } from './order-number.service';
import { InventoryService } from '../../inventory/inventory.service';
import { CouponsService } from '../../coupons/services/coupons.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { Cart } from '../../cart/entities/cart.entity';
import { CartItem } from '../../cart/entities/cart-item.entity';
import { CartStatus } from '../../cart/enums/cart-status.enum';
import { Address } from '../../users/entities/address.entity';
import { ProductStatus } from '../../catalog/enum/productstaus.enum';
import { CheckoutDto } from '../dto/checkout.dto';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { OrderQueryDto } from '../dto/order-query.dto';
import {
  OrderResponseDto,
  OrderSummaryResponseDto,
  CheckoutResponseDto,
  PaginatedOrdersResponseDto,
  OrderItemResponseDto,
  OrderHistoryResponseDto,
} from '../dto/order-response.dto';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [
    OrderStatus.CONFIRMED,
    OrderStatus.FAILED,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.CONFIRMED]: [
    OrderStatus.PROCESSING,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.PROCESSING]: [
    OrderStatus.SHIPPED,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.REFUNDED],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.REFUNDED],
  [OrderStatus.COMPLETED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.FAILED]: [],
  [OrderStatus.REFUNDED]: [],
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(OrderHistory)
    private readonly orderHistoryRepository: Repository<OrderHistory>,
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    private readonly orderNumberService: OrderNumberService,
    private readonly inventoryService: InventoryService,
    private readonly couponsService: CouponsService,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Executes single-transaction checkout flow using authenticated user's active cart.
   */
  async checkout(
    userId: string,
    dto: CheckoutDto,
  ): Promise<CheckoutResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      // 1. Retrieve Active Cart
      const cart = await manager.findOne(Cart, {
        where: { user: { id: userId }, status: CartStatus.ACTIVE },
        relations: {
          cartItems: {
            productVariant: {
              product: {
                brand: true,
                category: true,
                media: true,
              },
            },
          },
        },
      });

      if (!cart || !cart.cartItems || cart.cartItems.length === 0) {
        throw new BadRequestException('Active cart is empty or does not exist.');
      }

      // 2. Validate Address ownership
      const address = await manager.findOne(Address, {
        where: { id: dto.addressId, user: { id: userId } },
        relations: { user: true },
      });

      if (!address) {
        throw new NotFoundException(
          'Address not found or does not belong to the user.',
        );
      }

      // 3. Validate Products and Variants Active status
      for (const item of cart.cartItems) {
        const variant = item.productVariant;
        if (!variant) {
          throw new BadRequestException('Cart item contains invalid product variant.');
        }

        const product = variant.product;
        if (!product || product.status !== ProductStatus.ACTIVE) {
          throw new BadRequestException(
            `Product "${product?.name || 'Item'}" is no longer active.`,
          );
        }

        if (!variant.isActive) {
          throw new BadRequestException(
            `Product variant "${variant.sku}" is no longer active.`,
          );
        }
      }

      // 4. Calculate Totals using Database Price (Single Source of Truth)
      let subtotalNum = 0;
      const orderItemsToCreate: Partial<OrderItem>[] = [];

      for (const item of cart.cartItems) {
        const variant = item.productVariant;
        const product = variant.product;
        const unitPriceNum = Number(variant.price);

        if (isNaN(unitPriceNum) || unitPriceNum < 0) {
          throw new BadRequestException(
            `Invalid product price configured for SKU ${variant.sku}.`,
          );
        }

        const lineTotalNum = parseFloat(
          (unitPriceNum * item.quantity).toFixed(2),
        );
        subtotalNum += lineTotalNum;

        // Build variant attributes JSON
        const variantAttributes: Record<string, any> = {};
        if (variant.color) variantAttributes.color = variant.color;
        if (variant.size) variantAttributes.size = variant.size;

        const thumbnail =
          product.media && product.media.length > 0
            ? product.media[0].url
            : undefined;

        orderItemsToCreate.push({
          productVariant: variant,
          productVariantId: variant.id,
          productName: product.name,
          productSlug: product.slug,
          variantName:
            variant.color || variant.size
              ? [variant.color, variant.size].filter(Boolean).join(' / ')
              : variant.sku,
          variantAttributes:
            Object.keys(variantAttributes).length > 0
              ? variantAttributes
              : undefined,
          sku: variant.sku,
          brandName: product.brand?.name,
          categoryName: product.category?.name,
          thumbnail,
          unitPrice: unitPriceNum.toFixed(2),
          quantity: item.quantity,
          lineTotal: lineTotalNum.toFixed(2),
        });
      }

      const subtotal = subtotalNum.toFixed(2);
      const shippingFee = (0).toFixed(2);
      const tax = (0).toFixed(2);
      let discount = (0).toFixed(2);
      let appliedCouponCode: string | null = null;

      // Authoritative Coupon Validation during checkout
      if (dto.couponCode) {
        const couponResult =
          await this.couponsService.validateAndCalculateDiscount(
            userId,
            dto.couponCode,
            subtotalNum,
            manager,
          );
        discount = couponResult.discountFormatted;
        appliedCouponCode = couponResult.coupon.code;
      }

      const discountedSubtotal = Math.max(
        0,
        subtotalNum - parseFloat(discount),
      );
      const grandTotal = (
        discountedSubtotal +
        parseFloat(shippingFee) +
        parseFloat(tax)
      ).toFixed(2);

      // 5. Validate & Reserve Inventory (Pessimistic Locking owned by InventoryService)
      for (const item of cart.cartItems) {
        await this.inventoryService.reserveStock(
          item.productVariant.id,
          item.quantity,
          manager,
        );
      }

      // 6. Generate unique Order Number in-transaction
      const orderNumber = await this.orderNumberService.generateOrderNumber(
        manager,
      );

      // 7. Create Order Entity
      const now = new Date();
      const paymentExpiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 min expiry

      const orderEntity = manager.create(Order, {
        orderNumber,
        status: OrderStatus.PENDING_PAYMENT,
        subtotal,
        discount,
        couponCode: appliedCouponCode,
        tax,
        shippingFee,
        grandTotal,
        paymentMethod: dto.paymentMethod,
        paymentExpiresAt,
        shippingName: address.user?.fullName || 'Recipient',
        shippingPhone: '0000000000', // Default fallback if phone is not on address
        shippingStreet: address.street1,
        shippingAddressLine2: address.street2,
        shippingCity: address.city,
        shippingState: address.state,
        shippingCountry: address.country,
        shippingPostalCode: address.postalCode,
        notes: dto.notes,
        placedAt: now,
        user: { id: userId } as any,
      });

      const savedOrder = await manager.save(Order, orderEntity);

      // 8. Create Order Items
      const orderItems = orderItemsToCreate.map((itemData) =>
        manager.create(OrderItem, {
          ...itemData,
          order: savedOrder,
        }),
      );
      await manager.save(OrderItem, orderItems);
      savedOrder.orderItems = orderItems;

      // 9. Log initial OrderHistory entry
      await this.createHistory(
        manager,
        savedOrder,
        OrderStatus.PENDING_PAYMENT,
        userId,
        'CUSTOMER',
        'CHECKOUT_CREATED',
        'Order created via cart checkout.',
      );

      // 10. Clear Active Cart Items
      await manager.delete(CartItem, { cart: { id: cart.id } });

      // 11. Send in-app notification & dispatch order confirmation email post-commit
      const customer = address.user as any;
      await this.notificationsService.notifyOrderCreated(
        {
          id: savedOrder.id,
          orderNumber: savedOrder.orderNumber,
          subtotal: savedOrder.subtotal,
          discount: savedOrder.discount,
          shippingFee: savedOrder.shippingFee,
          grandTotal: savedOrder.grandTotal,
          items: orderItems,
        },
        {
          id: userId,
          email: customer?.email || '',
          fullName: customer?.fullName || address.user?.fullName || 'Valued Customer',
        },
        manager,
      );

      // 12. Format & Return Response
      const responseOrder = this.mapToOrderResponseDto(savedOrder);

      return {
        order: responseOrder,
        nextAction: {
          paymentRequired: true,
          paymentMethod: dto.paymentMethod,
        },
      };
    });
  }

  /**
   * Updates order lifecycle status with state machine transition validation.
   */
  async updateOrderStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    changedByUserId?: string,
    changedByRole: string = 'ADMIN',
    externalManager?: EntityManager,
  ): Promise<OrderResponseDto> {
    if (dto.status === OrderStatus.REFUNDED) {
      throw new BadRequestException(
        'Direct status transition to REFUNDED is not allowed. Refunds must be processed through the payment refund workflow.',
      );
    }
    return this.transitionOrder(
      orderId,
      dto.status,
      changedByUserId,
      changedByRole,
      'STATUS_UPDATE',
      dto.notes,
      externalManager,
    );
  }

  /**
   * Allows customer to cancel their own order (if in PENDING_PAYMENT or CONFIRMED state).
   */
  async cancelOwnOrder(
    userId: string,
    orderId: string,
    notes?: string,
    externalManager?: EntityManager,
  ): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, user: { id: userId } },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    if (
      order.status !== OrderStatus.PENDING_PAYMENT &&
      order.status !== OrderStatus.CONFIRMED
    ) {
      throw new ForbiddenException(
        `Orders in ${order.status} status cannot be cancelled by customer.`,
      );
    }

    return this.transitionOrder(
      orderId,
      OrderStatus.CANCELLED,
      userId,
      'CUSTOMER',
      'CUSTOMER_CANCEL',
      notes || 'Cancelled by customer.',
      externalManager,
    );
  }

  /**
   * Retrieves lightweight summary list of orders for the authenticated user.
   */
  async getUserOrders(
    userId: string,
    query: OrderQueryDto,
  ): Promise<PaginatedOrdersResponseDto> {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoin('order.orderItems', 'item')
      .where('order.userId = :userId', { userId });

    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    if (query.search) {
      qb.andWhere(
        '(order.orderNumber ILIKE :search OR item.productName ILIKE :search OR item.sku ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('order.createdAt', 'DESC').skip(skip).take(limit);

    const [orders, totalItems] = await qb.getManyAndCount();
    const totalPages = Math.ceil(totalItems / limit);

    const items: OrderSummaryResponseDto[] = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      grandTotal: Number(o.grandTotal),
      totalItems: o.orderItems ? o.orderItems.length : 0,
      paymentMethod: o.paymentMethod,
      recipientName: o.shippingName,
      placedAt: o.placedAt,
      createdAt: o.createdAt,
    }));

    return {
      items,
      meta: { page, limit, totalItems, totalPages },
    };
  }

  /**
   * Retrieves complete detailed order for the owner user.
   */
  async getUserOrderById(
    userId: string,
    orderIdOrNumber: string,
  ): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: [
        { id: orderIdOrNumber, user: { id: userId } },
        { orderNumber: orderIdOrNumber, user: { id: userId } },
      ],
      relations: {
        orderItems: true,
        history: true,
        payment: true,
      },
      order: {
        history: { createdAt: 'ASC' },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return this.mapToOrderResponseDto(order);
  }

  /**
   * Admin API: Paginated search & filtering across all system orders.
   */
  async getAllOrders(
    query: OrderQueryDto,
  ): Promise<PaginatedOrdersResponseDto> {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.orderItems', 'item');

    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    if (query.paymentMethod) {
      qb.andWhere('order.paymentMethod = :paymentMethod', {
        paymentMethod: query.paymentMethod,
      });
    }

    if (query.search) {
      qb.andWhere(
        '(order.orderNumber ILIKE :search OR user.fullName ILIKE :search OR order.shippingName ILIKE :search OR order.shippingPhone ILIKE :search OR item.productName ILIKE :search OR item.sku ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.startDate) {
      qb.andWhere('order.createdAt >= :startDate', {
        startDate: query.startDate,
      });
    }

    if (query.endDate) {
      qb.andWhere('order.createdAt <= :endDate', {
        endDate: query.endDate,
      });
    }

    const sortField =
      query.sortBy === 'orderNumber'
        ? 'order.orderNumber'
        : query.sortBy === 'grandTotal'
        ? 'order.grandTotal'
        : 'order.createdAt';

    const sortOrder = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    qb.orderBy(sortField, sortOrder).skip(skip).take(limit);

    const [orders, totalItems] = await qb.getManyAndCount();
    const totalPages = Math.ceil(totalItems / limit);

    const items: OrderSummaryResponseDto[] = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      grandTotal: Number(o.grandTotal),
      totalItems: o.orderItems ? o.orderItems.length : 0,
      paymentMethod: o.paymentMethod,
      recipientName: o.shippingName,
      placedAt: o.placedAt,
      createdAt: o.createdAt,
    }));

    return {
      items,
      meta: { page, limit, totalItems, totalPages },
    };
  }

  /**
   * Admin API: Retrieves full detailed order by ID or OrderNumber.
   */
  async getAdminOrderById(orderIdOrNumber: string): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: [{ id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }],
      relations: {
        orderItems: true,
        history: true,
        payment: true,
        user: true,
      },
      order: {
        history: { createdAt: 'ASC' },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return this.mapToOrderResponseDto(order);
  }

  // =========================================================================
  // Internal Payment Preparation Hooks (Architecture integration points)
  // =========================================================================

  /**
   * Internal hook called when payment is initialized for an order.
   */
  public async createPendingPayment(
    orderId: string,
    paymentMethod: any,
  ): Promise<void> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found.');
    order.paymentMethod = paymentMethod;
    await this.orderRepository.save(order);
  }

  /**
   * Internal hook called when payment succeeds.
   */
  public async confirmPayment(
    orderId: string,
    transactionReference?: string,
    externalManager?: EntityManager,
  ): Promise<OrderResponseDto> {
    return this.transitionOrder(
      orderId,
      OrderStatus.CONFIRMED,
      undefined,
      'SYSTEM',
      'PAYMENT_SUCCESS',
      `Payment confirmed. Ref: ${transactionReference || 'N/A'}`,
      externalManager,
    );
  }

  /**
   * Internal hook called when payment fails.
   */
  public async failPayment(
    orderId: string,
    reason?: string,
    externalManager?: EntityManager,
  ): Promise<OrderResponseDto> {
    return this.transitionOrder(
      orderId,
      OrderStatus.FAILED,
      undefined,
      'SYSTEM',
      'PAYMENT_FAILED',
      reason || 'Payment processing failed.',
      externalManager,
    );
  }

  /**
   * Internal hook called when payment expires due to timeout.
   */
  public async expirePendingPayment(
    orderId: string,
    externalManager?: EntityManager,
  ): Promise<OrderResponseDto> {
    return this.transitionOrder(
      orderId,
      OrderStatus.FAILED,
      undefined,
      'SYSTEM',
      'AUTO_EXPIRE',
      'Order payment window expired.',
      externalManager,
    );
  }

  /**
   * Internal hook called when an order is refunded.
   */
  public async refundPayment(
    orderId: string,
    reason?: string,
    externalManager?: EntityManager,
  ): Promise<OrderResponseDto> {
    return this.transitionOrder(
      orderId,
      OrderStatus.REFUNDED,
      undefined,
      'SYSTEM',
      'REFUND_PROCESSED',
      reason || 'Order refunded.',
      externalManager,
    );
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  private async transitionOrder(
    orderId: string,
    targetStatus: OrderStatus,
    changedByUserId?: string,
    changedByRole: string = 'SYSTEM',
    changeReason?: string,
    notes?: string,
    externalManager?: EntityManager,
  ): Promise<OrderResponseDto> {
    const execute = async (manager: EntityManager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        relations: { orderItems: true, history: true, payment: true, user: true },
      });

      if (!order) {
        throw new NotFoundException('Order not found.');
      }

      // Validate transition against state machine matrix
      this.validateTransition(order.status, targetStatus);

      // Handle stock reservation lifecycle adjustments based on status transitions
      if (
        targetStatus === OrderStatus.CONFIRMED ||
        targetStatus === OrderStatus.PROCESSING
      ) {
        if (order.status === OrderStatus.PENDING_PAYMENT) {
          for (const item of order.orderItems) {
            if (item.productVariantId) {
              await this.inventoryService.commitReservation(
                item.productVariantId,
                item.quantity,
                manager,
              );
            }
          }

          // Atomically consume coupon usage on payment confirmation
          if (order.couponCode) {
            const customerId = order.user?.id;
            if (customerId) {
              await this.couponsService.consumeCoupon(
                customerId,
                order.id,
                order.couponCode,
                order.discount,
                manager,
              );
            }
          }
        }
      } else if (
        targetStatus === OrderStatus.CANCELLED ||
        targetStatus === OrderStatus.FAILED ||
        targetStatus === OrderStatus.REFUNDED
      ) {
        if (order.status === OrderStatus.PENDING_PAYMENT) {
          for (const item of order.orderItems) {
            if (item.productVariantId) {
              await this.inventoryService.releaseReservation(
                item.productVariantId,
                item.quantity,
                manager,
              );
            }
          }
        } else if (
          order.status === OrderStatus.CONFIRMED ||
          order.status === OrderStatus.PROCESSING
        ) {
          // If committed unfulfilled stock is cancelled or refunded, return stock to inventory
          for (const item of order.orderItems) {
            if (item.productVariantId) {
              await this.inventoryService.increaseStock(
                item.productVariantId,
                item.quantity,
                manager,
              );
            }
          }
        }
        // Note: For SHIPPED, DELIVERED, COMPLETED orders that are refunded, inventory remains untouched as stock was fulfilled.
      }

      const previousStatus = order.status;
      order.status = targetStatus;
      const updatedOrder = await manager.save(Order, order);

      await this.createHistory(
        manager,
        updatedOrder,
        targetStatus,
        changedByUserId,
        changedByRole,
        changeReason,
        notes,
      );

      if (order.user) {
        await this.notificationsService.notifyOrderStatusUpdated(
          {
            id: order.id,
            orderNumber: order.orderNumber,
            notes,
          },
          previousStatus,
          targetStatus,
          {
            id: order.user.id,
            email: order.user.email,
            fullName: order.user.fullName || order.shippingName,
          },
          manager,
        );
      }

      return this.mapToOrderResponseDto(updatedOrder);
    };

    if (externalManager) {
      return execute(externalManager);
    }
    return this.dataSource.transaction((manager) => execute(manager));
  }

  private validateTransition(
    currentStatus: OrderStatus,
    targetStatus: OrderStatus,
  ): void {
    if (currentStatus === targetStatus) {
      return;
    }

    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedTransitions.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot transition order status from ${currentStatus} to ${targetStatus}.`,
      );
    }
  }

  private async createHistory(
    manager: EntityManager,
    order: Order,
    status: OrderStatus,
    changedByUserId?: string,
    changedByRole: string = 'SYSTEM',
    changeReason?: string,
    notes?: string,
  ): Promise<OrderHistory> {
    const historyItem = manager.create(OrderHistory, {
      order,
      status,
      changedByUserId,
      changedByRole,
      changeReason,
      notes,
    });

    return manager.save(OrderHistory, historyItem);
  }

  private mapToOrderResponseDto(order: Order): OrderResponseDto {
    const items: OrderItemResponseDto[] = (order.orderItems || []).map(
      (item) => ({
        id: item.id,
        productVariantId: item.productVariantId || item.productVariant?.id,
        productName: item.productName,
        productSlug: item.productSlug,
        variantName: item.variantName,
        variantAttributes: item.variantAttributes,
        sku: item.sku,
        brandName: item.brandName,
        categoryName: item.categoryName,
        thumbnail: item.thumbnail,
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
        subtotal: Number(item.lineTotal),
      }),
    );

    const history: OrderHistoryResponseDto[] = (order.history || []).map(
      (h) => ({
        id: h.id,
        status: h.status,
        changedByUserId: h.changedByUserId,
        changedByRole: h.changedByRole,
        changeReason: h.changeReason,
        notes: h.notes,
        createdAt: h.createdAt,
      }),
    );

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      shippingFee: Number(order.shippingFee),
      tax: Number(order.tax),
      grandTotal: Number(order.grandTotal),
      paymentMethod: order.paymentMethod,
      paymentExpiresAt: order.paymentExpiresAt,
      shippingAddress: {
        recipientName: order.shippingName,
        recipientPhone: order.shippingPhone || 'N/A',
        shippingAddressLine1: order.shippingStreet,
        shippingAddressLine2: order.shippingAddressLine2,
        shippingCity: order.shippingCity,
        shippingState: order.shippingState,
        shippingCountry: order.shippingCountry,
        shippingPostalCode: order.shippingPostalCode,
      },
      notes: order.notes,
      placedAt: order.placedAt,
      items,
      history: history.length > 0 ? history : undefined,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
