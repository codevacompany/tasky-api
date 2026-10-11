import { IsNotEmpty, IsUUID } from 'class-validator';

export class ApplyTicketTagDto {
    @IsNotEmpty()
    @IsUUID()
    tagUuid: string;
}
