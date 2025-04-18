import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { RoleController } from './role.controller';
import { RoleRepository } from './role.repository';
import { RoleService } from './role.service';

@Module({
    imports: [TypeOrmModule.forFeature([Role])],
    exports: [RoleService, RoleRepository],
    controllers: [RoleController],
    providers: [RoleService, RoleRepository],
})
export class RoleModule {}
