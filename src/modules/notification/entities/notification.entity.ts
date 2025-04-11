import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { IdTimestampBaseEntity } from '../../../shared/common/id-timestamp.base-entity';
import { User } from '../../user/entities/user.entity';

export enum NotificationType {
    Open = 'Abertura',
    Comment = 'Comentário',
    StatusUpdated = 'Atualização de Status',
}

@Entity()
export class Notification extends IdTimestampBaseEntity {
    @Column({ type: 'enum', enum: NotificationType })
    type: NotificationType;

    @Column('text')
    message: string;

    @Column({ default: false })
    read: boolean;

    @Column({ nullable: true })
    createdById: number;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'createdById' })
    createdBy: User;

    @Column()
    targetUserId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'targetUserId' })
    targetUser: User;

    @Column({ nullable: true })
    resourceId: number;
}
