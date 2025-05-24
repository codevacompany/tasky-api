import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessProfile, GetAccessProfile } from '../../shared/common/access-profile';
import { GetQueryOptions } from '../../shared/decorators/get-query-options.decorator';
import { GlobalAdminGuard } from '../../shared/guards/global-admin.guard';
import { QueryOptions } from '../../shared/types/http';
import { CreateSubscriptionDto } from './dtos/create-subscription.dto';
import { UpdateSubscriptionDto } from './dtos/update-subscription.dto';
import { SubscriptionType } from './entities/subscription.entity';
import { SubscriptionService } from './subscription.service';

@Controller('subscriptions')
@UseGuards(AuthGuard('jwt'))
export class SubscriptionController {
    constructor(private readonly subscriptionService: SubscriptionService) {}

    @Post()
    @UseGuards(GlobalAdminGuard)
    create(
        @Body() createSubscriptionDto: CreateSubscriptionDto,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.subscriptionService.create(accessProfile, createSubscriptionDto);
    }

    @Post('tenant/:tenantId/renew')
    @UseGuards(GlobalAdminGuard)
    renewSubscription(
        @Param('tenantId', ParseIntPipe) tenantId: number,
        @Query('type') type: SubscriptionType = SubscriptionType.MONTHLY,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.subscriptionService.createRenewal(accessProfile, tenantId, type);
    }

    @Get()
    findAll(
        @GetAccessProfile() accessProfile: AccessProfile,
        @GetQueryOptions() options: QueryOptions<any>,
        @Query('type') type?: SubscriptionType,
        @Query('isActive') isActive?: boolean,
    ) {
        return this.subscriptionService.findAll(
            accessProfile,
            {
                type,
                isActive,
            },
            options,
        );
    }

    @Get('tenant/:tenantId')
    findForTenant(
        @Param('tenantId', ParseIntPipe) tenantId: number,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.subscriptionService.findForTenant(accessProfile, tenantId);
    }

    @Get('tenant/:tenantId/active')
    findActiveTenantSubscription(
        @Param('tenantId', ParseIntPipe) tenantId: number,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.subscriptionService.findActiveSubscription(accessProfile, tenantId);
    }

    @Get(':id')
    findOne(
        @Param('id', ParseIntPipe) id: number,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.subscriptionService.findOne(accessProfile, id);
    }

    @Patch(':id')
    @UseGuards(GlobalAdminGuard)
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateSubscriptionDto: UpdateSubscriptionDto,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.subscriptionService.updateSubscription(
            accessProfile,
            id,
            updateSubscriptionDto,
        );
    }

    @Post(':id/cancel')
    @UseGuards(GlobalAdminGuard)
    cancel(
        @Param('id', ParseIntPipe) id: number,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.subscriptionService.cancel(accessProfile, id);
    }

    @Delete(':id')
    @UseGuards(GlobalAdminGuard)
    remove(
        @Param('id', ParseIntPipe) id: number,
        @GetAccessProfile() accessProfile: AccessProfile,
    ) {
        return this.subscriptionService.remove(accessProfile, id);
    }
}
