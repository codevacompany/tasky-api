import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalAdminGuard } from '../../shared/guards/global-admin.guard';
import { EmailModule } from '../../shared/services/email/email.module';
import { EncryptionModule } from '../../shared/services/encryption/encryption.module';
import { AuthModule } from '../auth/auth.module';
import { RoleModule } from '../role/role.module';
import { User } from './entities/user.entity';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

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
    providers: [UserService, UserRepository, GlobalAdminGuard],
})
export class UserModule {}
