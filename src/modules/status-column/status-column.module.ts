import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatusColumnController } from './status-column.controller';
import { StatusColumnRepository } from './status-column.repository';
import { StatusColumnService } from './status-column.service';
import { StatusColumn } from './entities/status-column.entity';

@Module({
    imports: [TypeOrmModule.forFeature([StatusColumn])],
    controllers: [StatusColumnController],
    providers: [StatusColumnService, StatusColumnRepository],
    exports: [StatusColumnService, TypeOrmModule],
})
export class StatusColumnModule {}
