import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateDepartmentDto {
    @IsOptional()
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    name?: string;
}
