import { IsOptional, IsString, IsInt, IsDateString } from 'class-validator';

export class UpdateTicketUpdateDto {
    @IsInt()
    @IsOptional()
    ticketId?: number;

    @IsInt()
    @IsOptional()
    userId?: number;

    @IsDateString()
    @IsOptional()
    dateTime?: string;

    @IsString()
    @IsOptional()
    comment?: string;
}
