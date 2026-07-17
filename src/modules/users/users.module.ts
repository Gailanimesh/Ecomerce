import { Module } from '@nestjs/common';
import { Address } from './entities/address.entity';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm/dist/typeorm.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
    imports: [TypeOrmModule.forFeature([
  User,
  Role,
  Address,
])],
    controllers: [UsersController],
    providers: [UsersService],
})
export class UsersModule {}
