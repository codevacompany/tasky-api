import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { SubscriptionType } from '../entities/subscription.entity';

export class CreateSubscriptionDto {
    @IsNotEmpty()
    @IsNumber()
    tenantId: number;

    @IsNotEmpty()
    @IsDate()
    @Type(() => Date)
    startDate: Date;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    endDate?: Date;

    @IsOptional()
    @IsEnum(SubscriptionType)
    type?: SubscriptionType;
}
