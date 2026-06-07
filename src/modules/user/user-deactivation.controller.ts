import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { SubscriptionRequiredGuard } from '../../shared/guards/subscription-required.guard';
import { TermsAcceptanceRequiredGuard } from '../../shared/guards/terms-acceptance-required.guard';
import { UUIDValidationPipe } from '../../shared/pipes/uuid-validation.pipe';
import { DeactivateUserDto } from './dtos/deactivate-user.dto';
import { User } from './entities/user.entity';
import { UserDeactivationService } from './user-deactivation.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserDeactivationController {
    constructor(private readonly userDeactivationService: UserDeactivationService) {}

    @Get(':uuid/deactivation-preview')
    async getDeactivationPreview(
        @Param('uuid', UUIDValidationPipe) uuid: string,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.userDeactivationService.getDeactivationPreview(accessProfile, uuid);
    }

    @Post(':uuid/deactivate')
    @UseGuards(SubscriptionRequiredGuard, TermsAcceptanceRequiredGuard)
    async deactivateWithTicketReassignment(
        @Param('uuid', UUIDValidationPipe) uuid: string,
        @Body() deactivateUserDto: DeactivateUserDto,
        @GetAccessProfile() accessProfile: AccessProfile,
    ): Promise<User> {
        return this.userDeactivationService.deactivateWithTicketReassignment(
            accessProfile,
            uuid,
            deactivateUserDto,
        );
    }
}
