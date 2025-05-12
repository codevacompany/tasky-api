import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { DisapprovalReason } from '../entities/ticket-disapproval-reason.entity';

export class CreateTicketDisapprovalReasonDto {
    @IsEnum(DisapprovalReason)
    @IsNotEmpty()
    reason: DisapprovalReason;

    @IsString()
    @IsNotEmpty()
    details: string;
}
