import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';
import { CorrectionRequestRepository } from './correction-request-reason.repository';
import { CorrectionRequestService } from './correction-request-reason.service';

@Module({
    imports: [UserModule, NotificationModule],
    providers: [CorrectionRequestRepository, CorrectionRequestService],
    exports: [CorrectionRequestRepository, CorrectionRequestService],
})
export class CorrectionRequestModule {}
