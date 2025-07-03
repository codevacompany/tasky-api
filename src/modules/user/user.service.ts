import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { AccessProfile } from '../../shared/common/access-profile';
import { TenantBoundBaseService } from '../../shared/common/tenant-bound.base-service';
import { CustomConflictException } from '../../shared/exceptions/http-exception';
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
import { ChangePasswordDto } from './dtos/change-password.dto';

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

        const userRole = await this.roleRepository.findOneBy({ name: RoleName.User });

        await this.save(accessProfile, { ...data, roleId: userRole.id });

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
        // Prevent users from deactivating themselves
        if (data.isActive === false && accessProfile.userId === id) {
            throw new CustomConflictException({
                code: 'cannot-deactivate-self',
                message: 'Users cannot deactivate their own accounts',
            });
        }

        if (data.password) {
            const hashedPassword = this.encryptionService.hashSync(data.password);
            data.password = hashedPassword;
        }

        return super.update(accessProfile, id, data);
    }

    async superAdminUpdate(accessProfile: AccessProfile, id: number, data: UpdateUserDto) {
        if (data.password) {
            const hashedPassword = this.encryptionService.hashSync(data.password);
            data.password = hashedPassword;
        }

        return super.update(accessProfile, id, data, false);
    }

    async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            select: ['id', 'password', 'email'],
        });

        if (!user) {
            throw new CustomConflictException({
                code: 'user-not-found',
                message: 'User not found',
            });
        }

        const isCurrentPasswordValid = this.encryptionService.compareSync(
            changePasswordDto.currentPassword,
            user.password,
        );

        if (!isCurrentPasswordValid) {
            throw new CustomConflictException({
                code: 'invalid-current-password',
                message: 'Current password is incorrect',
            });
        }

        const hashedNewPassword = this.encryptionService.hashSync(changePasswordDto.newPassword);

        await this.userRepository.update(userId, {
            password: hashedNewPassword,
        });

        return { message: 'Password changed successfully' };
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
}
