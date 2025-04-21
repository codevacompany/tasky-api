import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTicketFileDto {
    @IsNotEmpty()
    @IsString()
    url: string;
}
