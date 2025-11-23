import { IsIn, IsOptional, IsString } from 'class-validator';
import { StripeBillingInterval } from '../../../shared/services/stripe/stripe.service';

export class SubscribeRequestDto {
    @IsString()
    planSlug: string;

    @IsOptional()
    @IsIn(['monthly', 'yearly'])
    billingInterval?: StripeBillingInterval;

    @IsOptional()
    @IsIn(['charge_automatically', 'send_invoice'])
    collectionMethod?: 'charge_automatically' | 'send_invoice';
}
