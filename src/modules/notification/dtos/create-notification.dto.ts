import { IsEnum, IsNotEmpty, IsString, IsDate } from 'class-validator';
import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
    @IsNotEmpty()
    @IsEnum(NotificationType)
    type: NotificationType;

    @IsNotEmpty()
    @IsString()
    message: string;

    @IsNotEmpty()
    @IsDate()
    dateTime: Date;
}
