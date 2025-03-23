import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateCategoryDto {
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    name: string;
}
