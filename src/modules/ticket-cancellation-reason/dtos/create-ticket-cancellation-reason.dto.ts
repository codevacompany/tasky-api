import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { CancellationReason } from '../entities/ticket-cancellation-reason.entity';

export class CreateTicketCancellationReasonDto {
    @IsEnum(CancellationReason)
    @IsNotEmpty()
    reason: CancellationReason;

    @IsString()
    @IsNotEmpty()
    details: string;
}
