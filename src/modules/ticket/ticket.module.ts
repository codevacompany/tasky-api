import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationModule } from '../notification/notification.module';
import { TenantModule } from '../tenant/tenant.module';
import { TicketUpdateModule } from '../ticket-updates/ticket-update.module';
import { UserModule } from '../user/user.module';
import { Ticket } from './entities/ticket.entity';
import { TicketController } from './ticket.controller';
import { TicketRepository } from './ticket.repository';
import { TicketService } from './ticket.service';
import { TicketFileModule } from '../ticket-file/ticket-file.module';
import { EmailModule } from '../../shared/services/email/email.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Ticket]),
        NotificationModule,
        UserModule,
        forwardRef(() => TicketUpdateModule),
        TenantModule,
        TenantModule,
        TicketFileModule,
        EmailModule,
    ],
    exports: [TicketService],
    controllers: [TicketController],
    providers: [TicketService, TicketRepository],
})
export class TicketModule {}
