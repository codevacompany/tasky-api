import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MentionDto {
    @IsInt()
    @IsNotEmpty()
    userId: number;

    @IsInt()
    @IsNotEmpty()
    position: number;

    @IsInt()
    @IsNotEmpty()
    length: number;
}

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

    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => MentionDto)
    mentions?: MentionDto[];
}
