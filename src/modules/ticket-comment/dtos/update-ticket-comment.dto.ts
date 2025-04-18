import { IsOptional, IsString } from 'class-validator';

export class UpdateTicketCommentDto {
    @IsString()
    @IsOptional()
    content?: string;
}
