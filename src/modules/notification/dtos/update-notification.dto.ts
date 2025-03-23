import { IsBoolean, IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { NotificationType } from '../entities/notification.entity';

export class UpdateNotificationDto {
    @IsOptional()
    @IsEnum(NotificationType)
    type?: NotificationType;

    @IsOptional()
    @IsString()
    message?: string;

    @IsOptional()
    @IsDate()
    dateTime?: Date;

    @IsOptional()
    @IsBoolean()
    read?: boolean;
}
