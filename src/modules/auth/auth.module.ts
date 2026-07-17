import { Module, Session } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports:[TypeOrmModule.forFeature([Session])],
  controllers: [AuthController],
  providers: [AuthService]
})
export class AuthModule {}
