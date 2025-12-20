import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class AddTicketAssigneeDto {
    @IsNotEmpty()
    @IsNumber()
    targetUserId: number;

    @IsOptional()
    @IsNumber()
    order?: number; // If not provided, will be added at the end
}

