import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateTicketCommentDto {
    @IsInt()
    @IsNotEmpty()
    ticketId: number;

    @IsInt()
    @IsNotEmpty()
    userId: number;

    @IsString()
    @IsNotEmpty()
    content: string;
}
