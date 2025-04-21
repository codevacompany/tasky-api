import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketFileController } from './ticket-file.controller';
import { TicketFile } from './entities/ticket-file.entity';
import { TicketFileRepository } from './ticket-file.repository';
import { TicketFileService } from './ticket-file.service';

@Module({
    imports: [TypeOrmModule.forFeature([TicketFile])],
    exports: [TicketFileService, TicketFileRepository],
    controllers: [TicketFileController],
    providers: [TicketFileService, TicketFileRepository],
})
export class TicketFileModule {}
