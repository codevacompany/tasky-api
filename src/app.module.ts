import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { DatabaseSeederService } from './database/seeder/database-seeder.service';
import { AuthModule } from './modules/auth/auth.module';
import { CategoryModule } from './modules/category/category.module';
import { DepartmentModule } from './modules/department/department.module';
import { NotificationModule } from './modules/notification/notification.module';
import { TicketCommentModule } from './modules/ticket-comment/ticket-comment.module';
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
    ],
    controllers: [],
    providers: [DatabaseSeederService],
})
export class AppModule {}
