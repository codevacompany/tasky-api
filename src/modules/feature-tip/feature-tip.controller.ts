import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { MarkFeatureTipSeenDto } from './dtos/mark-feature-tip-seen.dto';
import { FeatureTipService } from './feature-tip.service';

@Controller('users/me/feature-tips')
@UseGuards(JwtAuthGuard)
export class FeatureTipController {
    constructor(private readonly featureTipService: FeatureTipService) {}

    @Post('seen')
    markSeen(@GetAccessProfile() accessProfile: AccessProfile, @Body() dto: MarkFeatureTipSeenDto) {
        return this.featureTipService.markSeen(accessProfile.userId, dto.tipId);
    }
}
