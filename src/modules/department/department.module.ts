import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { DepartmentController } from './department.controller';
import { DepartmentRepository } from './department.repository';
import { DepartmentService } from './department.service';
import { Department } from './entities/department.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Department, User])],
    exports: [DepartmentService],
    controllers: [DepartmentController],
    providers: [DepartmentService, DepartmentRepository],
})
export class DepartmentModule {}
