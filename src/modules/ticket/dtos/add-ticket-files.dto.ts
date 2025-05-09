import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class AddTicketFilesDto {
    @IsNotEmpty()
    @IsArray()
    @IsString({ each: true })
    files: string[];
}
