import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '../../shared/services/email/email.module';
import { EncryptionModule } from '../../shared/services/encryption/encryption.module';
import { AuthModule } from '../auth/auth.module';
import { User } from './entities/user.entity';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { RoleModule } from '../role/role.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        EncryptionModule,
        EmailModule,
        RoleModule,
        forwardRef(() => AuthModule),
    ],
    exports: [UserService, UserRepository],
    controllers: [UserController],
    providers: [UserService, UserRepository],
})
export class UserModule {}
