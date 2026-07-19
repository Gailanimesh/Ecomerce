import { Injectable, UnauthorizedException } from '@nestjs/common';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm/repository/Repository.js';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async findUserByEmail(email: string): Promise<User | null> {
        const user = await this.userRepository.findOne({
            where: { email },
        });
        if (!user) {
            throw new UnauthorizedException('User not found');
        }
        return user;
}
    async findUserById(id: string): Promise<User | null> {
        const user = await this.userRepository.findOne({
            where: { id },
        });
        if(!user){
            throw new UnauthorizedException('User not found');
        }

        return user;
    }





}
