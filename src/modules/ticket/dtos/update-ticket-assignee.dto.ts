import { IsNotEmpty, IsNumber } from 'class-validator';

export class UpdateTicketAssigneeDto {
    @IsNotEmpty()
    @IsNumber()
    targetUserId: number;

    @IsNotEmpty()
    @IsNumber()
    order: number;
}
