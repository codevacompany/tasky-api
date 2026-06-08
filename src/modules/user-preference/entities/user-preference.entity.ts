import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { IdTimestampBaseEntity } from '../../../shared/common/id-timestamp.base-entity';
import { User } from '../../user/entities/user.entity';

export interface NotificationPreferencesPayload {
    emailEnabled: boolean;
    disabledInAppEvents: string[];
    disabledEmailEvents: string[];
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferencesPayload = {
    emailEnabled: true,
    disabledInAppEvents: [],
    disabledEmailEvents: [],
};

@Entity()
@Unique(['userId'])
export class UserPreference extends IdTimestampBaseEntity {
    @Column()
    userId: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    tenantId: number;

    @Column({ type: 'jsonb' })
    notifications: NotificationPreferencesPayload;
}
