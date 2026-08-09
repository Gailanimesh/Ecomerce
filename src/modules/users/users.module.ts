import { Module } from '@nestjs/common';
import { Address } from './entities/address.entity';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm/dist/typeorm.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AddressController } from './address.controller';
import { AddressService } from './services/address.service';

@Module({
    imports: [TypeOrmModule.forFeature([
  User,
  Role,
  Address,
])],
    controllers: [UsersController, AddressController],
    providers: [UsersService, AddressService],
    exports: [UsersService, AddressService],
})
export class UsersModule {}
