import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateTicketCommentDto {
    @IsInt()
    @IsOptional()
    ticketId?: number;

    @IsInt()
    @IsOptional()
    userId?: number;

    @IsString()
    @IsOptional()
    content?: string;
}
