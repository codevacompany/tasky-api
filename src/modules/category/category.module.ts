import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantAdminGuard } from '../../shared/guards/tenant-admin.guard';
import { RoleModule } from '../role/role.module';
import { Ticket } from '../ticket/entities/ticket.entity';
import { CategoryController } from './category.controller';
import { CategoryRepository } from './category.repository';
import { CategoryService } from './category.service';
import { Category } from './entities/category.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Category, Ticket]), RoleModule],
    controllers: [CategoryController],
    providers: [CategoryService, CategoryRepository, TenantAdminGuard],
    exports: [CategoryService],
})
export class CategoryModule {}
