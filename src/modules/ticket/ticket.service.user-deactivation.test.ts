import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AccessProfile } from '../../shared/common/access-profile';
import { CustomBadRequestException } from '../../shared/exceptions/http-exception';
import { CorrectionRequestService } from '../correction-request-reason/correction-request-reason.service';
import { NotificationRepository } from '../notification/notification.repository';
import { NotificationService } from '../notification/notification.service';
import { TenantRepository } from '../tenant/tenant.repository';
import { TenantSubscriptionService } from '../tenant-subscription/tenant-subscription.service';
import { TicketCancellationReasonService } from '../ticket-cancellation-reason/ticket-cancellation-reason.service';
import { TicketDisapprovalReasonService } from '../ticket-disapproval-reason/ticket-disapproval-reason.service';
import { TicketFileRepository } from '../ticket-file/ticket-file.repository';
import { TicketTargetUserRepository } from '../ticket-target-user/ticket-target-user.repository';
import { TicketUpdateRepository } from '../ticket-updates/ticket-update.repository';
import { DepartmentService } from '../department/department.service';
import { RoleService } from '../role/role.service';
import { UserRepository } from '../user/user.repository';
import { TicketChecklistItem } from '../ticket-checklist/entities/ticket-checklist-item.entity';
import { StatusAction } from '../status-action/entities/status-action.entity';
import { TicketStatus as TicketStatusEntity } from '../ticket-status/entities/ticket-status.entity';
import { TicketService } from './ticket.service';
import { TicketRepository } from './ticket.repository';
import { EmailService } from '../../shared/services/email/email.service';
import { EncryptionService } from '../../shared/services/encryption/encryption.service';

describe('TicketService user deactivation', () => {
    let service: TicketService;

    const mockAccessProfile = new AccessProfile({
        tenantId: 1,
        userId: 99,
        roleId: 1,
    });

    const mockTicketRepository = {
        createQueryBuilder: jest.fn(),
    };

    const mockTicketTargetUserRepository = {
        find: jest.fn(),
    };

    const createQueryBuilderMock = (options: { getCount?: number; getMany?: unknown[] }) => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(options.getCount ?? 0),
        getMany: jest.fn().mockResolvedValue(options.getMany ?? []),
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TicketService,
                { provide: DataSource, useValue: {} },
                { provide: TicketRepository, useValue: mockTicketRepository },
                { provide: NotificationService, useValue: {} },
                { provide: NotificationRepository, useValue: {} },
                { provide: UserRepository, useValue: {} },
                { provide: TicketUpdateRepository, useValue: {} },
                { provide: TenantRepository, useValue: {} },
                { provide: TicketFileRepository, useValue: {} },
                { provide: TicketCancellationReasonService, useValue: {} },
                { provide: TicketDisapprovalReasonService, useValue: {} },
                { provide: CorrectionRequestService, useValue: {} },
                { provide: EmailService, useValue: {} },
                { provide: EncryptionService, useValue: {} },
                { provide: TenantSubscriptionService, useValue: {} },
                { provide: TicketTargetUserRepository, useValue: mockTicketTargetUserRepository },
                { provide: RoleService, useValue: {} },
                { provide: DepartmentService, useValue: {} },
                { provide: getRepositoryToken(StatusAction), useValue: {} },
                { provide: getRepositoryToken(TicketStatusEntity), useValue: {} },
                { provide: getRepositoryToken(TicketChecklistItem), useValue: {} },
            ],
        }).compile();

        service = module.get<TicketService>(TicketService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getUserDeactivationTicketCounts', () => {
        it('should return open target-user and reviewer ticket counts', async () => {
            mockTicketRepository.createQueryBuilder
                .mockReturnValueOnce(createQueryBuilderMock({ getCount: 3 }))
                .mockReturnValueOnce(createQueryBuilderMock({ getCount: 2 }));

            const result = await service.getUserDeactivationTicketCounts(mockAccessProfile, 10);

            expect(result).toEqual({
                targetUserTicketCount: 3,
                reviewerTicketCount: 2,
            });
            expect(mockTicketRepository.createQueryBuilder).toHaveBeenCalledTimes(2);
        });
    });

    describe('reassignTicketsOnUserDeactivation', () => {
        it('should replace assignee using updateAssignee when replacement is not already assigned', async () => {
            const updateAssigneeSpy = jest
                .spyOn(service, 'updateAssignee')
                .mockResolvedValue({} as never);
            const removeAssigneeSpy = jest
                .spyOn(service, 'removeAssignee')
                .mockResolvedValue({} as never);
            const updateReviewerSpy = jest
                .spyOn(service, 'updateReviewer')
                .mockResolvedValue({} as never);

            mockTicketRepository.createQueryBuilder
                .mockReturnValueOnce(
                    createQueryBuilderMock({
                        getMany: [{ id: 1, customId: 'T-001' }],
                    }),
                )
                .mockReturnValueOnce(createQueryBuilderMock({ getMany: [] }));

            mockTicketTargetUserRepository.find.mockResolvedValue([
                { id: 1, userId: 10, order: 1 },
                { id: 2, userId: 11, order: 2 },
            ]);

            await service.reassignTicketsOnUserDeactivation(mockAccessProfile, 10, 20);

            expect(updateAssigneeSpy).toHaveBeenCalledWith(mockAccessProfile, 'T-001', 20, 1);
            expect(removeAssigneeSpy).not.toHaveBeenCalled();
            expect(updateReviewerSpy).not.toHaveBeenCalled();
        });

        it('should remove assignee when replacement is already on the ticket', async () => {
            jest.spyOn(service, 'updateAssignee').mockResolvedValue({} as never);
            const removeAssigneeSpy = jest
                .spyOn(service, 'removeAssignee')
                .mockResolvedValue({} as never);
            jest.spyOn(service, 'updateReviewer').mockResolvedValue({} as never);

            mockTicketRepository.createQueryBuilder
                .mockReturnValueOnce(
                    createQueryBuilderMock({
                        getMany: [{ id: 1, customId: 'T-002' }],
                    }),
                )
                .mockReturnValueOnce(createQueryBuilderMock({ getMany: [] }));

            mockTicketTargetUserRepository.find.mockResolvedValue([
                { id: 1, userId: 10, order: 1 },
                { id: 2, userId: 20, order: 2 },
            ]);

            await service.reassignTicketsOnUserDeactivation(mockAccessProfile, 10, 20);

            expect(removeAssigneeSpy).toHaveBeenCalledWith(mockAccessProfile, 'T-002', 10);
        });

        it('should update reviewer for reviewer tickets', async () => {
            jest.spyOn(service, 'updateAssignee').mockResolvedValue({} as never);
            jest.spyOn(service, 'removeAssignee').mockResolvedValue({} as never);
            const updateReviewerSpy = jest
                .spyOn(service, 'updateReviewer')
                .mockResolvedValue({} as never);

            mockTicketRepository.createQueryBuilder
                .mockReturnValueOnce(createQueryBuilderMock({ getMany: [] }))
                .mockReturnValueOnce(
                    createQueryBuilderMock({
                        getMany: [{ customId: 'T-003' }, { customId: 'T-004' }],
                    }),
                );

            await service.reassignTicketsOnUserDeactivation(mockAccessProfile, 10, undefined, 30);

            expect(updateReviewerSpy).toHaveBeenCalledWith(mockAccessProfile, 'T-003', 30);
            expect(updateReviewerSpy).toHaveBeenCalledWith(mockAccessProfile, 'T-004', 30);
        });

        it('should throw when target user tickets exist but no replacement is provided', async () => {
            mockTicketRepository.createQueryBuilder.mockReturnValueOnce(
                createQueryBuilderMock({
                    getMany: [{ id: 1, customId: 'T-005' }],
                }),
            );

            await expect(
                service.reassignTicketsOnUserDeactivation(mockAccessProfile, 10),
            ).rejects.toMatchObject({
                response: expect.objectContaining({ code: 'new-target-user-required' }),
            });
        });

        it('should throw when reviewer tickets exist but no reviewer is provided', async () => {
            mockTicketRepository.createQueryBuilder
                .mockReturnValueOnce(createQueryBuilderMock({ getMany: [] }))
                .mockReturnValueOnce(
                    createQueryBuilderMock({
                        getMany: [{ customId: 'T-006' }],
                    }),
                );

            await expect(
                service.reassignTicketsOnUserDeactivation(mockAccessProfile, 10, 20),
            ).rejects.toMatchObject({
                response: expect.objectContaining({ code: 'new-reviewer-required' }),
            });
        });

        it('should throw CustomBadRequestException for missing reviewer', async () => {
            mockTicketRepository.createQueryBuilder
                .mockReturnValueOnce(createQueryBuilderMock({ getMany: [] }))
                .mockReturnValueOnce(
                    createQueryBuilderMock({
                        getMany: [{ customId: 'T-007' }],
                    }),
                );

            await expect(
                service.reassignTicketsOnUserDeactivation(mockAccessProfile, 10, 20),
            ).rejects.toBeInstanceOf(CustomBadRequestException);
        });
    });
});
