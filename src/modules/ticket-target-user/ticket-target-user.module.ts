import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketTargetUser } from './entities/ticket-target-user.entity';
import { TicketTargetUserRepository } from './ticket-target-user.repository';
import { TicketTargetUserService } from './ticket-target-user.service';

@Module({
    imports: [TypeOrmModule.forFeature([TicketTargetUser])],
    providers: [TicketTargetUserService, TicketTargetUserRepository],
    exports: [TicketTargetUserService],
})
export class TicketTargetUserModule {}
