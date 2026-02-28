import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { AwsModule } from './modules/aws/aws.module';
import { CategoryModule } from './modules/category/category.module';
import { CorrectionRequestModule } from './modules/correction-request-reason/correction-request-reason.module';
import { DepartmentModule } from './modules/department/department.module';
import { LegalDocumentModule } from './modules/legal-document/legal-document.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PaymentModule } from './modules/payment/payment.module';
import { RoleModule } from './modules/role/role.module';
import { SignUpModule } from './modules/sign-up/sign-up.module';
import { StatsModule } from './modules/stats/stats.module';
import { StatusActionModule } from './modules/status-action/status-action.module';
import { StatusColumnModule } from './modules/status-column/status-column.module';
import { SubscriptionPlanModule } from './modules/subscription-plan/subscription-plan.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { TicketStatusModule } from './modules/ticket-status/ticket-status.module';
import { TenantSubscriptionModule } from './modules/tenant-subscription/tenant-subscription.module';
import { TicketCancellationReasonModule } from './modules/ticket-cancellation-reason/ticket-cancellation-reason.module';
import { TicketCommentModule } from './modules/ticket-comment/ticket-comment.module';
import { TicketDisapprovalReasonModule } from './modules/ticket-disapproval-reason/ticket-disapproval-reason.module';
import { TicketFileModule } from './modules/ticket-file/ticket-file.module';
import { TicketChecklistModule } from './modules/ticket-checklist/ticket-checklist.module';
import { TicketTargetUserModule } from './modules/ticket-target-user/ticket-target-user.module';
import { TicketUpdateModule } from './modules/ticket-updates/ticket-update.module';
import { TicketModule } from './modules/ticket/ticket.module';
import { UserModule } from './modules/user/user.module';
import { VerificationCodeModule } from './modules/verification-code/verification-code.module';
import { RedisModule } from './shared/redis/redis.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        RedisModule,
        DatabaseModule,
        UserModule,
        AuthModule,
        VerificationCodeModule,
        CategoryModule,
        DepartmentModule,
        NotificationModule,
        TicketModule,
        TicketCommentModule,
        TicketUpdateModule,
        TicketCancellationReasonModule,
        TicketDisapprovalReasonModule,
        CorrectionRequestModule,
        TenantModule,
        SignUpModule,
        RoleModule,
        AwsModule,
        TicketFileModule,
        TicketChecklistModule,
        TicketTargetUserModule,
        StatsModule,
        StatusColumnModule,
        StatusActionModule,
        TicketStatusModule,
        LegalDocumentModule,
        PaymentModule,
        SubscriptionPlanModule,
        TenantSubscriptionModule,
    ],
    controllers: [AppController],
    providers: [
        {
            provide: APP_FILTER,
            useClass: GlobalExceptionFilter,
        },
    ],
})
export class AppModule {}
