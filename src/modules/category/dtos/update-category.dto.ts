import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateCategoryDto {
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    name?: string;
}
