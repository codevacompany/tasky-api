import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '../../shared/services/email/email.module';
import { TenantSubscriptionModule } from '../tenant-subscription/tenant-subscription.module';
import { UserPreferenceModule } from '../user-preference/user-preference.module';
import { Notification } from './entities/notification.entity';
import { NotificationDispatcher } from './notification-dispatcher.service';
import { NotificationPreferenceController } from './notification-preference.controller';
import { NotificationPreferenceService } from './notification-preference.service';
import { NotificationController } from './notification.controller';
import { NotificationRepository } from './notification.repository';
import { NotificationService } from './notification.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Notification]),
        UserPreferenceModule,
        TenantSubscriptionModule,
        EmailModule,
    ],
    exports: [
        NotificationService,
        NotificationRepository,
        NotificationPreferenceService,
        NotificationDispatcher,
    ],
    controllers: [NotificationController, NotificationPreferenceController],
    providers: [
        NotificationService,
        NotificationRepository,
        NotificationPreferenceService,
        NotificationDispatcher,
    ],
})
export class NotificationModule {}
