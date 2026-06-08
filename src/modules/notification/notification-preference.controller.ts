import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { UpdateNotificationPreferenceDto } from './dtos/update-notification-preference.dto';
import { NotificationPreferenceService } from './notification-preference.service';

@Controller('users/me/notification-preferences')
@UseGuards(JwtAuthGuard)
export class NotificationPreferenceController {
    constructor(private readonly notificationPreferenceService: NotificationPreferenceService) {}

    @Get()
    getPreferences(@GetAccessProfile() accessProfile: AccessProfile) {
        return this.notificationPreferenceService.getPreferences(
            accessProfile.userId,
            accessProfile.tenantId,
        );
    }

    @Patch()
    updatePreferences(
        @GetAccessProfile() accessProfile: AccessProfile,
        @Body() dto: UpdateNotificationPreferenceDto,
    ) {
        return this.notificationPreferenceService.updatePreferences(
            accessProfile.userId,
            accessProfile.tenantId,
            dto,
        );
    }
}
