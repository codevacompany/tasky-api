import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTenantDto {
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    name: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    @MaxLength(3)
    customKey: string;
}
