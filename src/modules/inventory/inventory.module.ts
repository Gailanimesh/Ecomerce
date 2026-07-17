import { Module } from '@nestjs/common';
import { Inventory } from './entities/inventory.entity';
import { TypeOrmModule } from '@nestjs/typeorm/dist/typeorm.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
    imports: [TypeOrmModule.forFeature([
        Inventory,
    ])],
    controllers: [InventoryController],
    providers: [InventoryService],
})
export class InventoryModule {}
