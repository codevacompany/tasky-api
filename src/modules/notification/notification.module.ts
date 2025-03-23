import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationController } from './notification.controller';
import { NotificationRepository } from './notification.repository';
import { NotificationService } from './notification.service';

@Module({
    imports: [TypeOrmModule.forFeature([Notification])],
    exports: [NotificationService],
    controllers: [NotificationController],
    providers: [NotificationService, NotificationRepository],
})
export class NotificationModule {}
