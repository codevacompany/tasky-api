import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { PermissionRepository } from './permission.repository';

@Injectable()
export class PermissionService {
    constructor(private permissionRepository: PermissionRepository) {}

    async findAll() {
        return this.permissionRepository.find({
            order: { name: 'ASC' },
        });
    }

    async findByKeys(keys: string[]) {
        return this.permissionRepository.find({
            where: { key: In(keys) },
        });
    }
}
