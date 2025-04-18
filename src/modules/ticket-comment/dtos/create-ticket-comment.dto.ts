import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateTicketCommentDto {
    @IsInt()
    @IsNotEmpty()
    ticketId: number;

    @IsString()
    @IsNotEmpty()
    ticketCustomId: string;

    @IsInt()
    @IsNotEmpty()
    userId: number;

    @IsString()
    @IsNotEmpty()
    content: string;
}
