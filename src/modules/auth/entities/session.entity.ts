import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,

} from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
@Entity('sessions')
export class Session extends BaseEntity {


  @Index()
  @ManyToOne(() => User, (user) => user.sessions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  refreshTokenHash!: string;

  @Index()
  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

    @Column({
        nullable: true,
        length: 45,
    })
    ipAddress?: string;

@Column({
    nullable: true,
    length: 500,
})
userAgent?: string;

}