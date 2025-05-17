import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { DatabaseSeederService } from './database/seeder/database-seeder.service';
import { AuthModule } from './modules/auth/auth.module';
import { AwsModule } from './modules/aws/aws.module';
import { CategoryModule } from './modules/category/category.module';
import { CorrectionRequestModule } from './modules/correction-request-reason/correction-request-reason.module';
import { DepartmentModule } from './modules/department/department.module';
import { LegalDocumentModule } from './modules/legal-document/legal-document.module';
import { NotificationModule } from './modules/notification/notification.module';
import { RoleModule } from './modules/role/role.module';
import { SignUpModule } from './modules/sign-up/sign-up.module';
import { StatsModule } from './modules/stats/stats.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { TicketCancellationReasonModule } from './modules/ticket-cancellation-reason/ticket-cancellation-reason.module';
import { TicketCommentModule } from './modules/ticket-comment/ticket-comment.module';
import { TicketDisapprovalReasonModule } from './modules/ticket-disapproval-reason/ticket-disapproval-reason.module';
import { TicketFileModule } from './modules/ticket-file/ticket-file.module';
import { TicketUpdateModule } from './modules/ticket-updates/ticket-update.module';
import { TicketModule } from './modules/ticket/ticket.module';
import { UserModule } from './modules/user/user.module';
import { VerificationCodeModule } from './modules/verification-code/verification-code.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
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
        StatsModule,
        LegalDocumentModule,
    ],
    controllers: [],
    providers: [DatabaseSeederService],
})
export class AppModule {}
