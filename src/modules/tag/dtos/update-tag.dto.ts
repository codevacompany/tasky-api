import {
    ArrayUnique,
    IsArray,
    IsBoolean,
    IsHexColor,
    IsOptional,
    IsString,
    MinLength,
} from 'class-validator';

export class UpdateTagDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    name?: string;

    @IsOptional()
    @IsHexColor()
    color?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsArray()
    @ArrayUnique()
    suggestedForDepartmentIds?: number[];
}
