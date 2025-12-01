import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateChecklistDto {
    @IsNotEmpty()
    @IsString()
    title: string;

    @IsNotEmpty()
    @IsNumber()
    ticketId: number;
}

