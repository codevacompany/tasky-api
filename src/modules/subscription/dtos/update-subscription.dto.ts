import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional } from 'class-validator';
import { SubscriptionType } from '../entities/subscription.entity';

export class UpdateSubscriptionDto {
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    startDate?: Date;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    endDate?: Date;

    @IsOptional()
    @IsEnum(SubscriptionType)
    type?: SubscriptionType;
}
