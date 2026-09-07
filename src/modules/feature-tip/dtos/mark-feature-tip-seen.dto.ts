import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class MarkFeatureTipSeenDto {
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    @Matches(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/i)
    tipId: string;
}
