import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { RoleEnum } from '../../../common/enums/roles.enum';
import { User } from './user.entity';

@Entity('roles')
export class Role extends BaseEntity {
  @Column({
    type: 'enum',
    enum: RoleEnum,
    unique: true,
  })
  name!: RoleEnum;

  @OneToMany(() => User, (user) => user.role)
  users!: User[];
}