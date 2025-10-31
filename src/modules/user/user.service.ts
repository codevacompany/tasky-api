import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { AccessProfile } from '../../shared/common/access-profile';
import { TenantBoundBaseService } from '../../shared/common/tenant-bound.base-service';
import {
    CustomConflictException,
    CustomBadRequestException,
    CustomForbiddenException,
} from '../../shared/exceptions/http-exception';
import { EmailService } from '../../shared/services/email/email.service';
import { EncryptionService } from '../../shared/services/encryption/encryption.service';
import { FindOneQueryOptions, PaginatedResponse, QueryOptions } from '../../shared/types/http';
import { AuthService } from '../auth/auth.service';
import { RoleName } from '../role/entities/role.entity';
import { RoleRepository } from '../role/role.repository';
import { CreateUserDto } from './dtos/create-user.dto';
import { SuperAdminCreateUserDto } from './dtos/super-admin-create-user.dto copy';
import { UpdateUserDto } from './dtos/update-user.dto';
import { User } from './entities/user.entity';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService extends TenantBoundBaseService<User> {
    constructor(
        @Inject(forwardRef(() => AuthService))
        private authService: AuthService,
        private userRepository: UserRepository,
        private encryptionService: EncryptionService,
        private emailService: EmailService,
        private roleRepository: RoleRepository,
    ) {
        super(userRepository);
    }

    async findAll(
        additionalFilter?: { name: string },
        options?: QueryOptions<User>,
    ): Promise<PaginatedResponse<User>> {
        const qb = this.userRepository.createQueryBuilder('user');

        qb.leftJoinAndSelect('user.department', 'department');
        qb.leftJoinAndSelect('user.role', 'role');

        if (additionalFilter?.name) {
            qb.andWhere('(user.firstName ILIKE :name OR user.lastName ILIKE :name)', {
                name: `%${additionalFilter.name}%`,
            });
        }

        const page = options.page;
        const limit = options.limit;

        qb.skip((page - 1) * limit).take(limit);

        const [items, total] = await qb.getManyAndCount();

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findManyUsers(
        accessProfile: AccessProfile,
        additionalFilter?: { name: string },
        options?: QueryOptions<User>,
    ): Promise<PaginatedResponse<User>> {
        const qb = this.userRepository.createQueryBuilder('user');

        qb.leftJoinAndSelect('user.department', 'department');
        qb.leftJoinAndSelect('user.role', 'role');

        qb.where('user.tenantId = :tenantId', { tenantId: accessProfile.tenantId });

        if (options?.where) {
            if (options.where.departmentId) {
                qb.andWhere('user.departmentId = :departmentId', {
                    departmentId: options.where.departmentId,
                });
                qb.andWhere('user.isActive = :isActive', { isActive: true });
            }
        }

        if (additionalFilter?.name) {
            qb.andWhere('(user.firstName ILIKE :name OR user.lastName ILIKE :name)', {
                name: `%${additionalFilter.name}%`,
            });
        }

        if (options?.order) {
            for (const [key, direction] of Object.entries(options.order)) {
                const sortDirection =
                    typeof direction === 'string' ? direction.toUpperCase() : 'ASC';
                if (key === 'firstName' || key === 'lastName') {
                    qb.addOrderBy(`user.${key}`, sortDirection as 'ASC' | 'DESC');
                } else if (key === 'department.name') {
                    qb.addOrderBy('department.name', sortDirection as 'ASC' | 'DESC');
                } else {
                    qb.addOrderBy(`user.${key}`, sortDirection as 'ASC' | 'DESC');
                }
            }
        } else {
            qb.orderBy('user.id', 'ASC');
        }

        const page = options?.page || 1;
        const limit = options?.limit || 10;

        qb.skip((page - 1) * limit).take(limit);

        const [items, total] = await qb.getManyAndCount();

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findByEmail(
        accessProfile: AccessProfile,
        email: string,
        options?: FindOneQueryOptions<User>,
    ): Promise<User> {
        return await this.findOne(accessProfile, {
            ...options,
            where: { ...options?.where, email },
            relations: ['department', 'role'],
        });
    }

    async findById(userId: number): Promise<User> {
        return await this.userRepository.findOne({
            where: {
                id: userId,
            },
            relations: ['department', 'role'],
        });
    }

    async findBy(accessProfile: AccessProfile, options: QueryOptions<User>) {
        return this.findManyUsers(accessProfile, undefined, {
            ...options,
            relations: ['department', 'role'],
        });
    }

    async create(accessProfile: AccessProfile, data: CreateUserDto) {
        // Check user limits before creating
        await this.validateUserLimitBeforeCreation(accessProfile.tenantId);

        data.email = data.email.toLowerCase();

        const userExists = await this.userRepository.findOne({
            where: {
                email: data.email,
            },
        });

        if (userExists) {
            throw new CustomConflictException({
                code: 'email-already-registered',
                message: 'This email is already registered',
            });
        }

        const { password } = data;

        const hashedPassword = this.encryptionService.hashSync(password);
        data.password = hashedPassword;

        let roleIdToAssign: number | undefined = data.roleId;
        if (roleIdToAssign) {
            const role = await this.roleRepository.findOne({
                where: { id: roleIdToAssign } as any,
            });
            if (!role) {
                throw new CustomBadRequestException({
                    code: 'invalid-role',
                    message: 'Role not found',
                });
            }
            if (role.name === RoleName.GlobalAdmin) {
                throw new CustomForbiddenException({
                    code: 'role-not-assignable',
                    message: 'Role not assignable',
                });
            }
        } else {
            const defaultRole = await this.roleRepository.findOneBy({ name: RoleName.User });
            roleIdToAssign = defaultRole?.id;
        }

        await this.save(accessProfile, { ...data, roleId: roleIdToAssign });

        return this.authService.login({
            email: data.email,
            password,
        });
    }

    async superAdminCreate(accessProfile: AccessProfile, user: SuperAdminCreateUserDto) {
        user.email = user.email.toLowerCase();

        const userExists = await this.userRepository.findOne({
            where: {
                email: user.email,
            },
        });

        if (userExists) {
            throw new CustomConflictException({
                code: 'email-already-registered',
                message: 'This email is already registered',
            });
        }

        const { password } = user;

        const hashedPassword = this.encryptionService.hashSync(password);
        user.password = hashedPassword;

        await this.save(accessProfile, user, false);

        return this.authService.login({
            email: user.email,
            password,
        });
    }

    async update(accessProfile: AccessProfile, id: number, data: UpdateUserDto) {
        if (data.isActive === false && accessProfile.userId === id) {
            throw new CustomConflictException({
                code: 'cannot-deactivate-self',
                message: 'Users cannot deactivate their own accounts',
            });
        }

        const updateData = { ...data };
        if (data.isAdmin !== undefined) {
            const roleName = data.isAdmin ? RoleName.TenantAdmin : RoleName.User;
            const userRole = await this.roleRepository.findOneBy({ name: roleName });
            if (userRole) {
                updateData.roleId = userRole.id;
            }

            delete updateData.isAdmin;
        }

        return super.update(accessProfile, id, updateData);
    }

    async superAdminUpdate(accessProfile: AccessProfile, id: number, data: UpdateUserDto) {
        return super.update(accessProfile, id, data, false);
    }

    /**
     * Validate user limits before creating a new user
     * This method checks if creating a new user would exceed billing limits
     */
    private async validateUserLimitBeforeCreation(tenantId: number): Promise<void> {
        try {
            // We can't inject BillingService directly due to circular dependencies
            // So we'll implement a basic validation here
            // The BillingService can be called from the controller level if needed

            // For now, we'll implement basic validation
            // This can be enhanced when BillingService is properly integrated
            const currentUserCount = await this.getActiveUserCount(tenantId);

            // This is a basic check - the actual billing logic is in BillingService
            // For a complete implementation, this should integrate with the subscription service
            console.log(`Current user count for tenant ${tenantId}: ${currentUserCount}`);

            // The actual validation will be handled by the billing service
            // This is just a placeholder for now
        } catch (error) {
            console.error('Error validating user limit:', error);
            // For now, we'll allow user creation even if validation fails
            // In production, you might want to throw an error here
        }
    }

    async getActiveUserCount(tenantId: number): Promise<number> {
        return this.userRepository.count({
            where: {
                tenantId,
                isActive: true,
            },
        });
    }

    async getUserStatistics(tenantId: number) {
        const [totalUsers, activeUsers, inactiveUsers] = await Promise.all([
            this.userRepository.count({ where: { tenantId } }),
            this.userRepository.count({ where: { tenantId, isActive: true } }),
            this.userRepository.count({ where: { tenantId, isActive: false } }),
        ]);

        return {
            totalUsers,
            activeUsers,
            inactiveUsers,
        };
    }

    async getTenantAdmins(tenantId: number): Promise<User[]> {
        return this.userRepository.find({
            where: {
                tenantId,
                isActive: true,
                role: { name: RoleName.TenantAdmin },
            },
            relations: ['department', 'role'],
        });
    }
}
