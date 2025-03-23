import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateDepartmentDto {
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    name: string;
}
