import { IsDateString, IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateTicketUpdateDto {
    @IsInt()
    @IsNotEmpty()
    ticketId: number;

    @IsInt()
    @IsNotEmpty()
    userId: number;

    @IsDateString()
    @IsNotEmpty()
    dateTime: string;

    @IsString()
    @IsNotEmpty()
    comment: string;
}
