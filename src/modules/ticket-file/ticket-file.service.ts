import { Injectable } from '@nestjs/common';
import { AccessProfile } from '../../shared/common/access-profile';
import { TenantBoundBaseService } from '../../shared/common/tenant-bound.base-service';
import { CreateTicketFileDto } from './dtos/create-ticket-file.dto';
import { TicketFile } from './entities/ticket-file.entity';
import { TicketFileRepository } from './ticket-file.repository';

@Injectable()
export class TicketFileService extends TenantBoundBaseService<TicketFile> {
    constructor(private ticketFileRepository: TicketFileRepository) {
        super(ticketFileRepository);
    }

    async create(acessProfile: AccessProfile, dto: CreateTicketFileDto) {
        return this.save(acessProfile, dto);
    }

    async delete(acessProfile: AccessProfile, id: number): Promise<void> {
        return super.delete(acessProfile, id);
    }
}
