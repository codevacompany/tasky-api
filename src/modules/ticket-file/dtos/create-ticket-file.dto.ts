import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTicketFileDto {
    @IsNotEmpty()
    @IsString()
    url: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    mimeType?: string;

    @IsOptional()
    @IsNumber()
    size?: number;

    @IsOptional()
    @IsNumber()
    ticketId?: number;
}
