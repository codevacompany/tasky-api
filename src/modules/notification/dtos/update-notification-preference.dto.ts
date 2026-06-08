import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateNotificationPreferenceDto {
    @IsOptional()
    @IsBoolean()
    emailEnabled?: boolean;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    disabledInAppEvents?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    disabledEmailEvents?: string[];
}
