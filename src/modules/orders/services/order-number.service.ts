import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Order } from '../entities/order.entity';
import * as crypto from 'crypto';

@Injectable()
export class OrderNumberService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Generates a collision-safe, customer-friendly order number.
   * Format: ORD-YYYYMMDD-XXXXXX (e.g., ORD-20260801-A7F9B2)
   * Executes inside the active transaction if manager is provided.
   */
  async generateOrderNumber(manager?: EntityManager): Promise<string> {
    const repository = manager
      ? manager.getRepository(Order)
      : this.dataSource.getRepository(Order);

    const datePrefix = this.getFormattedDatePrefix();
    const maxAttempts = 5;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const randomSuffix = crypto
        .randomBytes(3)
        .toString('hex')
        .toUpperCase(); // 6 random hex characters
      const candidateNumber = `ORD-${datePrefix}-${randomSuffix}`;

      const existing = await repository.findOne({
        where: { orderNumber: candidateNumber },
        select: { id: true },
      });

      if (!existing) {
        return candidateNumber;
      }
    }

    // Fallback if random hex collides repeatedly (extremely rare)
    const timestampSuffix = Date.now().toString().slice(-6);
    return `ORD-${datePrefix}-${timestampSuffix}`;
  }

  private getFormattedDatePrefix(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
}
