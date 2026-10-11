import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantAdminOrSupervisorGuard } from '../../shared/guards/tenant-admin-or-supervisor.guard';
import { Department } from '../department/entities/department.entity';
import { RoleModule } from '../role/role.module';
import { Ticket } from '../ticket/entities/ticket.entity';
import { User } from '../user/entities/user.entity';
import { Tag } from './entities/tag.entity';
import { TicketTag } from './entities/ticket-tag.entity';
import { TagController } from './tag.controller';
import { TagRepository } from './tag.repository';
import { TagService } from './tag.service';

@Module({
    imports: [TypeOrmModule.forFeature([Tag, TicketTag, Department, Ticket, User]), RoleModule],
    controllers: [TagController],
    providers: [TagService, TagRepository, TenantAdminOrSupervisorGuard],
    exports: [TagService, TypeOrmModule],
})
export class TagModule {}
