import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { CorrectionReason } from '../entities/correction-request-reason.entity';

export class CreateCorrectionRequestDto {
    @IsEnum(CorrectionReason)
    @IsNotEmpty()
    reason: CorrectionReason;

    @IsString()
    @IsNotEmpty()
    details: string;
}
