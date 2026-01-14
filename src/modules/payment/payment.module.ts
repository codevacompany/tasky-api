import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './payment.repository';

import { PaymentController } from './payment.controller';
import { EmailModule } from '../../shared/services/email/email.module';
import { RoleModule } from '../role/role.module';
import { GlobalAdminGuard } from '../../shared/guards/global-admin.guard';

@Module({
    imports: [TypeOrmModule.forFeature([Payment]), EmailModule, RoleModule],
    controllers: [PaymentController],
    providers: [PaymentService, PaymentRepository, GlobalAdminGuard],
    exports: [PaymentService],
})
export class PaymentModule {}
