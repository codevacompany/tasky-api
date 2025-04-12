import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { ILike } from 'typeorm';
import { CustomConflictException } from '../../shared/exceptions/http-exception';
import { EmailService } from '../../shared/services/email/email.service';
import { EncryptionService } from '../../shared/services/encryption/encryption.service';
import { PaginatedResponse, QueryOptions } from '../../shared/types/http';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { User } from './entities/user.entity';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
    constructor(
        @Inject(forwardRef(() => AuthService))
        private authService: AuthService,
        private userRepository: UserRepository,
        private encryptionService: EncryptionService,
        private emailService: EmailService,
    ) {}

    async findAll(
        where?: { name: string },
        options?: QueryOptions,
    ): Promise<PaginatedResponse<User>> {
        const query = this.buildQuery(where);

        const [items, total] = await this.userRepository.findAndCount({
            where: query.where,
            relations: ['department'],
            skip: (options.page - 1) * options.limit,
            take: options.limit,
        });

        return {
            items,
            total,
            page: options.page,
            limit: options.limit,
            totalPages: Math.ceil(total / options.limit),
        };
    }

    async findByEmail(email: string): Promise<User> {
        return await this.userRepository.findOne({
            where: {
                email,
            },
            relations: ['department'],
        });
    }

    async findById(userId: number): Promise<User> {
        return await this.userRepository.findOne({
            where: {
                id: userId,
            },
            relations: ['department'],
        });
    }

    async findBy(where: Partial<User>): Promise<User[]> {
        return await this.userRepository.find({ where, relations: ['department'] });
    }

    private buildQuery(where: { name: string }) {
        if (!where.name) {
            return { where: {} };
        }

        return {
            where: [
                { firstName: ILike(`%${where.name}%`) },
                { lastName: ILike(`%${where.name}%`) },
            ],
        };
    }

    async create(user: CreateUserDto) {
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

    async update(id: number, user: UpdateUserDto) {
        if (user.password) {
            const hashedPassword = this.encryptionService.hashSync(user.password);
            user.password = hashedPassword;
        }

        await this.userRepository.update(id, user);

        return {
            message: 'Successfully updated!',
            userId: id,
        };
    }
}
