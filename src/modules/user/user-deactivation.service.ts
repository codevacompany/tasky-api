import { Injectable } from '@nestjs/common';
import { Not } from 'typeorm';
import { AccessProfile } from '../../shared/common/access-profile';
import { CustomBadRequestException } from '../../shared/exceptions/http-exception';
import { RoleName } from '../role/entities/role.entity';
import { RoleRepository } from '../role/role.repository';
import { TicketService } from '../ticket/ticket.service';
import { DeactivateUserDto } from './dtos/deactivate-user.dto';
import { UserDeactivationPreviewDto } from './dtos/user-deactivation-preview.dto';
import { User } from './entities/user.entity';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Injectable()
export class UserDeactivationService {
    constructor(
        private readonly userService: UserService,
        private readonly userRepository: UserRepository,
        private readonly roleRepository: RoleRepository,
        private readonly ticketService: TicketService,
    ) {}

    private async getDepartmentSupervisor(
        tenantId: number,
        departmentId: number | null | undefined,
        excludeUserId?: number,
    ): Promise<User | null> {
        if (!departmentId) {
            return null;
        }

        const supervisorRole = await this.roleRepository.findOneBy({ name: RoleName.Supervisor });
        if (!supervisorRole) {
            return null;
        }

        return this.userRepository.findOne({
            where: {
                tenantId,
                departmentId,
                roleId: supervisorRole.id,
                isActive: true,
                ...(excludeUserId ? { id: Not(excludeUserId) } : {}),
            },
            relations: ['department', 'role'],
        });
    }

    async getDeactivationPreview(
        accessProfile: AccessProfile,
        uuid: string,
    ): Promise<UserDeactivationPreviewDto> {
        const user = await this.userService.findByUuid(accessProfile, uuid);
        const { targetUserTicketCount, reviewerTicketCount } =
            await this.ticketService.getUserDeactivationTicketCounts(accessProfile, user.id);

        const tenantAdmins = await this.userService.getTenantAdmins(accessProfile.tenantId);

        const departmentUsers = user.departmentId
            ? await this.userRepository.find({
                  where: {
                      tenantId: accessProfile.tenantId,
                      departmentId: user.departmentId,
                      isActive: true,
                      id: Not(user.id),
                  },
                  relations: ['department', 'role'],
                  order: { firstName: 'ASC', lastName: 'ASC' },
              })
            : [];

        const useTenantAdminsForTargetUser = departmentUsers.length === 0;
        const targetUserOptions = useTenantAdminsForTargetUser
            ? tenantAdmins.filter((admin) => admin.id !== user.id)
            : departmentUsers;

        const departmentSupervisor = await this.getDepartmentSupervisor(
            accessProfile.tenantId,
            user.departmentId,
            user.id,
        );

        const requiresTargetUserSelection = targetUserTicketCount > 0;
        const requiresReviewerSelection = reviewerTicketCount > 0 && !departmentSupervisor;
        const reviewerOptions =
            requiresReviewerSelection && tenantAdmins.length > 0
                ? tenantAdmins.filter((admin) => admin.id !== user.id)
                : [];

        return {
            targetUserTicketCount,
            reviewerTicketCount,
            requiresTargetUserSelection,
            requiresReviewerSelection,
            useTenantAdminsForTargetUser,
            departmentSupervisor,
            targetUserOptions,
            reviewerOptions,
        };
    }

    async deactivateWithTicketReassignment(
        accessProfile: AccessProfile,
        uuid: string,
        deactivateUserDto: DeactivateUserDto,
    ): Promise<User> {
        const user = await this.userService.findByUuid(accessProfile, uuid);
        const preview = await this.getDeactivationPreview(accessProfile, uuid);

        if (preview.requiresTargetUserSelection) {
            if (preview.targetUserOptions.length === 0) {
                throw new CustomBadRequestException({
                    code: 'no-target-user-options',
                    message:
                        'There are no available users to receive the deactivated user tickets',
                });
            }

            if (!deactivateUserDto.newTargetUserId) {
                throw new CustomBadRequestException({
                    code: 'new-target-user-required',
                    message: 'Select a user to receive the deactivated user tickets',
                });
            }

            const isValidTargetUser = preview.targetUserOptions.some(
                (option) => option.id === deactivateUserDto.newTargetUserId,
            );

            if (!isValidTargetUser) {
                throw new CustomBadRequestException({
                    code: 'invalid-target-user',
                    message: 'The selected target user is not allowed for reassignment',
                });
            }
        }

        let resolvedReviewerId: number | undefined;
        if (preview.reviewerTicketCount > 0) {
            if (preview.departmentSupervisor) {
                resolvedReviewerId = preview.departmentSupervisor.id;
            } else {
                if (preview.reviewerOptions.length === 0) {
                    throw new CustomBadRequestException({
                        code: 'no-reviewer-options',
                        message:
                            'There are no available administrators to receive reviewer tickets',
                    });
                }

                if (!deactivateUserDto.newReviewerId) {
                    throw new CustomBadRequestException({
                        code: 'new-reviewer-required',
                        message: 'Select an administrator to receive reviewer tickets',
                    });
                }

                const isValidReviewer = preview.reviewerOptions.some(
                    (option) => option.id === deactivateUserDto.newReviewerId,
                );

                if (!isValidReviewer) {
                    throw new CustomBadRequestException({
                        code: 'invalid-reviewer',
                        message: 'The selected reviewer is not allowed for reassignment',
                    });
                }

                resolvedReviewerId = deactivateUserDto.newReviewerId;
            }
        }

        if (preview.targetUserTicketCount > 0 || preview.reviewerTicketCount > 0) {
            await this.ticketService.reassignTicketsOnUserDeactivation(
                accessProfile,
                user.id,
                deactivateUserDto.newTargetUserId,
                resolvedReviewerId,
            );
        }

        await this.userService.update(accessProfile, user.id, { isActive: false });
        return this.userService.findByUuid(accessProfile, uuid);
    }
}
