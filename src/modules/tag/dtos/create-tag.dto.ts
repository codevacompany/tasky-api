import {
    ArrayUnique,
    IsArray,
    IsHexColor,
    IsNotEmpty,
    IsOptional,
    IsString,
    MinLength,
} from 'class-validator';

export class CreateTagDto {
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    name: string;

    @IsNotEmpty()
    @IsHexColor()
    color: string;

    @IsOptional()
    @IsArray()
    @ArrayUnique()
    suggestedForDepartmentIds?: number[];
}
