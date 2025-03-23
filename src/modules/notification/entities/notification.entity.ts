import { Column, Entity } from 'typeorm';
import { IdTimestampBaseEntity } from '../../../shared/common/id-timestamp.base-entity';

export enum NotificationType {
    Open = 'abertura',
    Comment = 'comentário',
}

@Entity()
export class Notification extends IdTimestampBaseEntity {
    @Column({ type: 'enum', enum: NotificationType })
    type: NotificationType;

    @Column('text')
    message: string;

    @Column('timestamp')
    dateTime: Date;

    @Column({ default: false })
    read: boolean;
}
