import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { IdTimestampBaseEntity } from '../../../shared/common/id-timestamp.base-entity';
import { User } from '../../user/entities/user.entity';

@Entity('user_seen_feature_tip')
@Unique(['userId', 'tipId'])
export class UserSeenFeatureTip extends IdTimestampBaseEntity {
    @Column()
    @Index()
    userId: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ length: 128 })
    tipId: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    seenAt: Date;
}
