import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

class MentionDto {
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

export class UpdateTicketCommentDto {
    @IsString()
    @IsOptional()
    content?: string;

    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => MentionDto)
    mentions?: MentionDto[];
}
