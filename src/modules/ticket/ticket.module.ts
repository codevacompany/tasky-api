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

@Module({
    imports: [
        TypeOrmModule.forFeature([Ticket]),
        NotificationModule,
        UserModule,
        forwardRef(() => TicketUpdateModule),
        TenantModule,
        TenantModule,
    ],
    exports: [TicketService],
    controllers: [TicketController],
    providers: [TicketService, TicketRepository],
})
export class TicketModule {}
