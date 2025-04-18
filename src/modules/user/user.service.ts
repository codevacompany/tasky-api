import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { ILike } from 'typeorm';
import { TenantBoundBaseService } from '../../shared/common/tenant-bound.base-service';
import { CustomConflictException } from '../../shared/exceptions/http-exception';
import { EmailService } from '../../shared/services/email/email.service';
import { EncryptionService } from '../../shared/services/encryption/encryption.service';
import { PaginatedResponse, QueryOptions } from '../../shared/types/http';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { SuperAdminCreateUserDto } from './dtos/super-admin-create-user.dto copy';
import { UpdateUserDto } from './dtos/update-user.dto';
import { User } from './entities/user.entity';
import { UserRepository } from './user.repository';
import { RoleName } from '../role/entities/role.entity';
import { RoleRepository } from '../role/role.repository';

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
        user: User,
        where?: { name: string },
        options?: QueryOptions<User>,
    ): Promise<PaginatedResponse<User>> {
        const qb = this.userRepository.createQueryBuilder('user');

        qb.leftJoinAndSelect('user.department', 'department');
        qb.leftJoinAndSelect('user.role', 'role');

        qb.where('user.tenantId = :tenantId', { tenantId: user.tenantId });

        if (where?.name) {
            qb.andWhere(
                '(user.firstName ILIKE :name OR user.lastName ILIKE :name)',
                { name: `%${where.name}%` },
            );
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

    async findByEmail(email: string): Promise<User> {
        return await this.userRepository.findOne({
            where: {
                email,
            },
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

    async findBy(where: Partial<User>): Promise<User[]> {
        return await this.userRepository.find({ where, relations: ['department', 'role'] });
    }

    private buildQuery(where: { name: string }, tenantId: number) {
        if (!where.name) {
            return { where: { tenantId } };
        }

        return {
            where: {
                tenantId,
                $or: [
                    { firstName: ILike(`%${where.name}%`) },
                    { lastName: ILike(`%${where.name}%`) },
                ],
            },
        };
    }

    async create(user: User, data: CreateUserDto, tenantId: number) {
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

        await this.userRepository.save({ ...data, roleId: userRole.id, tenantId });

        return this.authService.login({
            email: data.email,
            password,
        });
    }

    async superAdminCreate(user: SuperAdminCreateUserDto) {
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

        await this.userRepository.save(user);

        return this.authService.login({
            email: user.email,
            password,
        });
    }

    async update(user: User, id: number, data: UpdateUserDto) {
        if (user.password) {
            const hashedPassword = this.encryptionService.hashSync(user.password);
            user.password = hashedPassword;
        }

        return super.update(user, id, data);
    }
}
