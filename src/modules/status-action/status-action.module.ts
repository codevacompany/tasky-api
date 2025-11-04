import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatusAction } from './entities/status-action.entity';

@Module({
    imports: [TypeOrmModule.forFeature([StatusAction])],
    exports: [TypeOrmModule],
})
export class StatusActionModule {}
