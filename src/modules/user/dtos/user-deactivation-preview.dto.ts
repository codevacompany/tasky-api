import { User } from '../entities/user.entity';

export class UserDeactivationPreviewDto {
    targetUserTicketCount: number;
    reviewerTicketCount: number;
    requiresTargetUserSelection: boolean;
    requiresReviewerSelection: boolean;
    useTenantAdminsForTargetUser: boolean;
    departmentSupervisor: User | null;
    targetUserOptions: User[];
    reviewerOptions: User[];
}
