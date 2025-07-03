import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from './entities/permission.entity';
import { PermissionService } from './permission.service';
import { PermissionRepository } from './permission.repository';

@Module({
    imports: [TypeOrmModule.forFeature([Permission])],
    providers: [PermissionService, PermissionRepository],
    exports: [PermissionService],
})
export class PermissionModule {}
