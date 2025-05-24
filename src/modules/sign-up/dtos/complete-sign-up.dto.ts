import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CompleteSignUpDto {
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    @MaxLength(3)
    customKey: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    password: string;
}
