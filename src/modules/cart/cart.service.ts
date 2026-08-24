import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { ProductVariant } from '../catalog/entities/product-variant.entity';
import { Product } from '../catalog/entities/product.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { User } from '../users/entities/user.entity';
import { CartStatus } from './enums/cart-status.enum';
import { ProductStatus } from '../catalog/enum/productstaus.enum';

import { InventoryService } from '../inventory/inventory.service';
import { ProductService } from '../catalog/services/product.service';
import { CouponsService } from '../coupons/services/coupons.service';
import { CartCouponPreviewDto } from '../coupons/dto/coupon-response.dto';

import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartResponseDto } from './dto/cart-response.dto';
import { CartItemResponseDto } from './dto/cart-item-response.dto';
import { CartSummaryDto } from './dto/cart-summary.dto';
import { CartValidationDto } from './dto/cart-validation.dto';
import { CheckoutPreparationDto } from './dto/checkout-preparation.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    private readonly inventoryService: InventoryService,
    private readonly productService: ProductService,
    private readonly couponsService: CouponsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Retrieves or creates a single active cart for the authenticated user (1:1 relationship).
   */
  async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { user: { id: userId }, status: CartStatus.ACTIVE },
      relations: {
        user: true,
        cartItems: {
          productVariant: {
            product: true,
          },
        },
      },
    });

    if (!cart) {
      const user = await this.dataSource.getRepository(User).findOne({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException('User not found.');
      }

      try {
        const newCart = this.cartRepository.create({
          user,
          status: CartStatus.ACTIVE,
          isActive: true,
          cartItems: [],
        });
        cart = await this.cartRepository.save(newCart);
        cart.user = user;
      } catch (error) {
        cart = await this.cartRepository.findOne({
          where: { user: { id: userId }, status: CartStatus.ACTIVE },
          relations: {
            user: true,
            cartItems: {
              productVariant: {
                product: true,
              },
            },
          },
        });
        if (!cart) {
          throw error;
        }
      }
    }

    return cart;
  }

  /**
   * Returns full enriched cart response including summary and validation warnings.
   */
  async getCart(userId: string): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(userId);
    return this.formatCartResponse(cart);
  }

  /**
   * Adds an item to the cart inside a database transaction.
   */
  async addItem(userId: string, dto: AddCartItemDto): Promise<CartResponseDto> {
    if (dto.quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1.');
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        // 1. Fetch variant with product
        const variant = await manager.findOne(ProductVariant, {
          where: { id: dto.productVariantId },
          relations: { product: true },
        });

        if (!variant) {
          throw new NotFoundException('Variant does not exist.');
        }

        // 2. Validate product status
        if (variant.product.status !== ProductStatus.ACTIVE) {
          throw new BadRequestException('Product is no longer active.');
        }

        // 3. Validate variant active status
        if (!variant.isActive) {
          throw new BadRequestException('Product variant is no longer active.');
        }

        // 4. Validate inventory existence
        const inventory = await manager.findOne(Inventory, {
          where: { variant: { id: variant.id } },
        });

        if (!inventory) {
          throw new NotFoundException('Inventory record does not exist for variant.');
        }

        // 5. Fetch or create cart for user inside transaction
        let cart = await manager.findOne(Cart, {
          where: { user: { id: userId }, status: CartStatus.ACTIVE },
          relations: { cartItems: true },
        });

        if (!cart) {
          const user = await manager.findOne(User, { where: { id: userId } });
          if (!user) {
            throw new NotFoundException('User not found.');
          }

          const newCart = manager.create(Cart, {
            user,
            status: CartStatus.ACTIVE,
            isActive: true,
          });
          cart = await manager.save(newCart);
        }

        // 6. Check existing item in cart
        const existingItem = await manager.findOne(CartItem, {
          where: {
            cart: { id: cart.id },
            productVariant: { id: variant.id },
          },
        });

        const existingQuantity = existingItem ? existingItem.quantity : 0;
        const requestedTotal = existingQuantity + dto.quantity;

        // 7. Validate inventory stock limit
        if (requestedTotal > inventory.availableQuantity) {
          throw new BadRequestException('Requested quantity exceeds available inventory.');
        }

        // 8. Insert or update cart item
        if (existingItem) {
          existingItem.quantity = requestedTotal;
          await manager.save(existingItem);
        } else {
          const cartItem = manager.create(CartItem, {
            cart,
            productVariant: variant,
            quantity: dto.quantity,
            unitPriceSnapshot: String(variant.price),
          });
          await manager.save(cartItem);
        }
      });
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw error;
    }

    return this.getCart(userId);
  }

  /**
   * Updates item quantity inside a database transaction. Removes item if quantity is 0.
   */
  async updateItem(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    if (dto.quantity < 0) {
      throw new BadRequestException('Negative quantities are invalid.');
    }

    await this.dataSource.transaction(async (manager) => {
      const cartItem = await manager.findOne(CartItem, {
        where: { id: itemId },
        relations: {
          cart: { user: true },
          productVariant: true,
        },
      });

      if (!cartItem) {
        throw new NotFoundException('Cart item not found.');
      }

      const cartUserId = cartItem.cart.user?.id || cartItem.cart.userId;
      if (cartUserId !== userId) {
        throw new ForbiddenException('You are not allowed to modify this cart item.');
      }

      if (dto.quantity === 0) {
        await manager.remove(cartItem);
      } else {
        const inventory = await manager.findOne(Inventory, {
          where: { variant: { id: cartItem.productVariant.id } },
        });

        const availableStock = inventory ? inventory.availableQuantity : 0;

        if (dto.quantity > availableStock) {
          throw new BadRequestException('Requested quantity exceeds available inventory.');
        }

        cartItem.quantity = dto.quantity;
        await manager.save(cartItem);
      }
    });

    return this.getCart(userId);
  }

  /**
   * Removes a cart item inside a database transaction.
   */
  async removeItem(userId: string, itemId: string): Promise<CartResponseDto> {
    await this.dataSource.transaction(async (manager) => {
      const cartItem = await manager.findOne(CartItem, {
        where: { id: itemId },
        relations: { cart: { user: true } },
      });

      if (!cartItem) {
        throw new NotFoundException('Cart item not found.');
      }

      const cartUserId = cartItem.cart.user?.id || cartItem.cart.userId;
      if (cartUserId !== userId) {
        throw new ForbiddenException('You are not allowed to remove this cart item.');
      }

      await manager.remove(cartItem);
    });

    return this.getCart(userId);
  }

  /**
   * Clears all items in the user's cart inside a database transaction.
   */
  async clearCart(userId: string): Promise<CartResponseDto> {
    await this.dataSource.transaction(async (manager) => {
      const cart = await manager.findOne(Cart, {
        where: { user: { id: userId }, status: CartStatus.ACTIVE },
        relations: { cartItems: true },
      });

      if (cart && cart.cartItems && cart.cartItems.length > 0) {
        await manager.remove(cart.cartItems);
      }
    });

    return this.getCart(userId);
  }

  /**
   * Formal contract method for Order module integration. Returns checkout readiness details.
   */
  async prepareCheckout(userId: string): Promise<CheckoutPreparationDto> {
    const cartResponse = await this.getCart(userId);
    const checkoutAllowed =
      cartResponse.items.length > 0 && cartResponse.validation.isValid;

    return {
      checkoutAllowed,
      cartSummary: cartResponse.summary,
      validation: cartResponse.validation,
      items: cartResponse.items,
    };
  }

  // ==========================================
  // Private Modular Validation & Helper Methods
  // ==========================================

  private validateProductStatus(product?: Product): string | null {
    if (!product || product.status !== ProductStatus.ACTIVE) {
      return `Product '${product?.name || 'Unknown'}' is inactive.`;
    }
    return null;
  }

  private validateVariant(variant?: ProductVariant): string | null {
    if (!variant || !variant.isActive) {
      return `Variant '${variant?.sku || 'Unknown'}' is inactive.`;
    }
    return null;
  }

  private validateInventory(
    inventory: Inventory | null | undefined,
    requestedQuantity: number,
    productName: string,
  ): string | null {
    if (!inventory) {
      return `Inventory missing for '${productName}'.`;
    }
    if (inventory.availableQuantity < requestedQuantity) {
      return `Only ${inventory.availableQuantity} items remain in stock for '${productName}'.`;
    }
    return null;
  }

  private validatePriceSnapshot(
    unitPriceSnapshot: string | number,
    currentPrice: string | number,
    productName: string,
  ): string | null {
    const snapshotVal = Number(unitPriceSnapshot);
    const currentVal = Number(currentPrice);
    if (snapshotVal !== currentVal) {
      return `Price for '${productName}' has changed from $${snapshotVal.toFixed(
        2,
      )} to $${currentVal.toFixed(2)}.`;
    }
    return null;
  }

  public async revalidateCartAsync(cartItems: CartItem[]): Promise<CartValidationDto> {
    const warnings: string[] = [];
    let isValid = true;

    for (const item of cartItems) {
      const variant = item.productVariant;
      const product = variant?.product;
      const inventory = variant?.id
        ? await this.inventoryRepository.findOne({ where: { variant: { id: variant.id } } })
        : null;
      const productName = product?.name || 'Product';

      const prodWarning = this.validateProductStatus(product);
      if (prodWarning) {
        warnings.push(prodWarning);
        isValid = false;
      }

      const varWarning = this.validateVariant(variant);
      if (varWarning) {
        warnings.push(varWarning);
        isValid = false;
      }

      const invWarning = this.validateInventory(
        inventory,
        item.quantity,
        productName,
      );
      if (invWarning) {
        warnings.push(invWarning);
        isValid = false;
      }

      const priceWarning = this.validatePriceSnapshot(
        item.unitPriceSnapshot,
        variant?.price || 0,
        productName,
      );
      if (priceWarning) {
        warnings.push(priceWarning);
      }
    }

    return {
      isValid,
      warnings,
    };
  }

  public calculateSummary(cartItems: CartItem[]): CartSummaryDto {
    const totalItems = cartItems.length;
    let totalQuantity = 0;
    let subtotal = 0;

    for (const item of cartItems) {
      totalQuantity += item.quantity;
      subtotal += item.quantity * Number(item.unitPriceSnapshot);
    }

    return {
      totalItems,
      totalQuantity,
      subtotal: parseFloat(subtotal.toFixed(2)),
    };
  }

  private async formatCartResponse(cart: Cart): Promise<CartResponseDto> {
    const rawItems = cart.cartItems || [];

    const items: CartItemResponseDto[] = await Promise.all(
      rawItems.map(async (item) => {
        const variant = item.productVariant;
        const product = variant?.product;
        const inventory = variant?.id
          ? await this.inventoryRepository.findOne({
              where: { variant: { id: variant.id } },
            })
          : null;

        const itemWarnings: string[] = [];
        const prodWarning = this.validateProductStatus(product);
        if (prodWarning) itemWarnings.push(prodWarning);

        const varWarning = this.validateVariant(variant);
        if (varWarning) itemWarnings.push(varWarning);

        const invWarning = this.validateInventory(
          inventory,
          item.quantity,
          product?.name || 'Product',
        );
        if (invWarning) itemWarnings.push(invWarning);

        const priceWarning = this.validatePriceSnapshot(
          item.unitPriceSnapshot,
          variant?.price || 0,
          product?.name || 'Product',
        );
        if (priceWarning) itemWarnings.push(priceWarning);

        const snapshotNum = Number(item.unitPriceSnapshot);
        const currentPriceNum = variant ? Number(variant.price) : 0;
        const itemSubtotal = parseFloat((item.quantity * snapshotNum).toFixed(2));
        const availableQty = inventory ? inventory.availableQuantity : 0;

        const isAvailable =
          product?.status === ProductStatus.ACTIVE &&
          !!variant?.isActive &&
          availableQty >= item.quantity;

        return {
          id: item.id,
          productId: product?.id || '',
          productName: product?.name || '',
          productSlug: product?.slug || '',
          variantId: variant?.id || '',
          sku: variant?.sku || '',
          thumbnailUrl: null,
          quantity: item.quantity,
          unitPriceSnapshot: parseFloat(snapshotNum.toFixed(2)),
          currentPrice: parseFloat(currentPriceNum.toFixed(2)),
          subtotal: itemSubtotal,
          availableQuantity: availableQty,
          isAvailable,
          warnings: itemWarnings,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      }),
    );

    const summary = this.calculateSummary(rawItems);
    const validation = await this.revalidateCartAsync(rawItems);

    const cartUserId = cart.user?.id || cart.userId || '';

    return {
      id: cart.id,
      userId: cartUserId,
      status: cart.status,
      items,
      summary,
      validation,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  /**
   * Previews coupon discount against the authenticated user's active cart.
   * Note: This is an authoritative preview; checkout revalidates the coupon before order creation.
   */
  async previewCoupon(
    userId: string,
    code: string,
  ): Promise<CartCouponPreviewDto> {
    const cart = await this.getCart(userId);
    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cannot apply coupon to an empty cart.');
    }

    const result = await this.couponsService.validateAndCalculateDiscount(
      userId,
      code,
      cart.summary.subtotal,
    );

    return {
      couponCode: result.coupon.code,
      description: result.coupon.description,
      discountType: result.coupon.discountType,
      discountValue: Number(result.coupon.discountValue),
      discount: result.discountNum,
      subtotal: cart.summary.subtotal,
      totalAfterDiscount: result.totalAfterDiscountNum,
    };
  }

  /**
   * Clears coupon preview and returns fresh cart details.
   */
  async removeCouponPreview(userId: string): Promise<CartResponseDto> {
    return this.getCart(userId);
  }
}
