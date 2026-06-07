import { IsInt, IsOptional } from 'class-validator';

export class DeactivateUserDto {
    @IsOptional()
    @IsInt()
    newTargetUserId?: number;

    @IsOptional()
    @IsInt()
    newReviewerId?: number;
}
