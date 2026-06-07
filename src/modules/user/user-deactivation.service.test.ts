import { Test, TestingModule } from '@nestjs/testing';
import { AccessProfile } from '../../shared/common/access-profile';
import { CustomBadRequestException } from '../../shared/exceptions/http-exception';
import { RoleName } from '../role/entities/role.entity';
import { RoleRepository } from '../role/role.repository';
import { TicketService } from '../ticket/ticket.service';
import { UserDeactivationService } from './user-deactivation.service';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

describe('UserDeactivationService', () => {
    let service: UserDeactivationService;

    const mockAccessProfile = new AccessProfile({
        tenantId: 1,
        userId: 99,
        roleId: 1,
    });

    const userToDeactivate = {
        id: 10,
        uuid: 'user-uuid-10',
        tenantId: 1,
        departmentId: 5,
        firstName: 'Pedro',
        lastName: 'Costa',
        isActive: true,
    };

    const departmentColleague = {
        id: 11,
        tenantId: 1,
        departmentId: 5,
        firstName: 'Joao',
        lastName: 'Silva',
        isActive: true,
    };

    const tenantAdmin = {
        id: 20,
        tenantId: 1,
        departmentId: 1,
        firstName: 'Maria',
        lastName: 'Santos',
        isActive: true,
        role: { name: RoleName.TenantAdmin },
    };

    const departmentSupervisor = {
        id: 12,
        tenantId: 1,
        departmentId: 5,
        firstName: 'Rafael',
        lastName: 'Campelo',
        isActive: true,
        role: { name: RoleName.Supervisor },
    };

    const mockUserService = {
        findByUuid: jest.fn(),
        getTenantAdmins: jest.fn(),
        update: jest.fn(),
    };

    const mockUserRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
    };

    const mockRoleRepository = {
        findOneBy: jest.fn(),
    };

    const mockTicketService = {
        getUserDeactivationTicketCounts: jest.fn(),
        reassignTicketsOnUserDeactivation: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserDeactivationService,
                { provide: UserService, useValue: mockUserService },
                { provide: UserRepository, useValue: mockUserRepository },
                { provide: RoleRepository, useValue: mockRoleRepository },
                { provide: TicketService, useValue: mockTicketService },
            ],
        }).compile();

        service = module.get<UserDeactivationService>(UserDeactivationService);

        mockUserService.findByUuid.mockResolvedValue(userToDeactivate);
        mockUserService.getTenantAdmins.mockResolvedValue([tenantAdmin]);
        mockUserService.update.mockResolvedValue(undefined);
        mockTicketService.getUserDeactivationTicketCounts.mockResolvedValue({
            targetUserTicketCount: 0,
            reviewerTicketCount: 0,
        });
        mockUserRepository.find.mockResolvedValue([departmentColleague]);
        mockRoleRepository.findOneBy.mockResolvedValue({ id: 3, name: RoleName.Supervisor });
        mockUserRepository.findOne.mockResolvedValue(departmentSupervisor);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getDeactivationPreview', () => {
        it('should expose department colleagues as target user options', async () => {
            mockTicketService.getUserDeactivationTicketCounts.mockResolvedValue({
                targetUserTicketCount: 2,
                reviewerTicketCount: 0,
            });

            const preview = await service.getDeactivationPreview(mockAccessProfile, userToDeactivate.uuid);

            expect(preview.targetUserOptions).toEqual([departmentColleague]);
            expect(preview.useTenantAdminsForTargetUser).toBe(false);
            expect(preview.requiresTargetUserSelection).toBe(true);
            expect(preview.requiresReviewerSelection).toBe(false);
        });

        it('should fall back to tenant admins when user is alone in the department', async () => {
            mockUserRepository.find.mockResolvedValue([]);
            mockTicketService.getUserDeactivationTicketCounts.mockResolvedValue({
                targetUserTicketCount: 1,
                reviewerTicketCount: 0,
            });

            const preview = await service.getDeactivationPreview(mockAccessProfile, userToDeactivate.uuid);

            expect(preview.useTenantAdminsForTargetUser).toBe(true);
            expect(preview.targetUserOptions).toEqual([tenantAdmin]);
        });

        it('should auto-assign department supervisor for reviewer tickets', async () => {
            mockTicketService.getUserDeactivationTicketCounts.mockResolvedValue({
                targetUserTicketCount: 0,
                reviewerTicketCount: 3,
            });

            const preview = await service.getDeactivationPreview(mockAccessProfile, userToDeactivate.uuid);

            expect(preview.departmentSupervisor).toEqual(departmentSupervisor);
            expect(preview.requiresReviewerSelection).toBe(false);
            expect(preview.reviewerOptions).toEqual([]);
        });

        it('should require admin reviewer selection when department has no supervisor', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);
            mockTicketService.getUserDeactivationTicketCounts.mockResolvedValue({
                targetUserTicketCount: 0,
                reviewerTicketCount: 2,
            });

            const preview = await service.getDeactivationPreview(mockAccessProfile, userToDeactivate.uuid);

            expect(preview.requiresReviewerSelection).toBe(true);
            expect(preview.reviewerOptions).toEqual([tenantAdmin]);
        });

        it('should not require reassignment when user has no open tickets', async () => {
            const preview = await service.getDeactivationPreview(mockAccessProfile, userToDeactivate.uuid);

            expect(preview.requiresTargetUserSelection).toBe(false);
            expect(preview.requiresReviewerSelection).toBe(false);
            expect(preview.targetUserTicketCount).toBe(0);
            expect(preview.reviewerTicketCount).toBe(0);
        });
    });

    describe('deactivateWithTicketReassignment', () => {
        it('should deactivate user without reassigning when there are no open tickets', async () => {
            const deactivatedUser = { ...userToDeactivate, isActive: false };
            mockUserService.findByUuid
                .mockResolvedValueOnce(userToDeactivate)
                .mockResolvedValueOnce(userToDeactivate)
                .mockResolvedValueOnce(deactivatedUser);

            const result = await service.deactivateWithTicketReassignment(
                mockAccessProfile,
                userToDeactivate.uuid,
                {},
            );

            expect(mockTicketService.reassignTicketsOnUserDeactivation).not.toHaveBeenCalled();
            expect(mockUserService.update).toHaveBeenCalledWith(mockAccessProfile, userToDeactivate.id, {
                isActive: false,
            });
            expect(result).toEqual(deactivatedUser);
        });

        it('should reassign tickets using department colleague and department supervisor', async () => {
            mockTicketService.getUserDeactivationTicketCounts.mockResolvedValue({
                targetUserTicketCount: 2,
                reviewerTicketCount: 1,
            });

            const deactivatedUser = { ...userToDeactivate, isActive: false };
            mockUserService.findByUuid
                .mockResolvedValueOnce(userToDeactivate)
                .mockResolvedValueOnce(userToDeactivate)
                .mockResolvedValueOnce(deactivatedUser);

            await service.deactivateWithTicketReassignment(mockAccessProfile, userToDeactivate.uuid, {
                newTargetUserId: departmentColleague.id,
            });

            expect(mockTicketService.reassignTicketsOnUserDeactivation).toHaveBeenCalledWith(
                mockAccessProfile,
                userToDeactivate.id,
                departmentColleague.id,
                departmentSupervisor.id,
            );
            expect(mockUserService.update).toHaveBeenCalledWith(mockAccessProfile, userToDeactivate.id, {
                isActive: false,
            });
        });

        it('should reassign reviewer tickets to selected tenant admin when there is no supervisor', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);
            mockTicketService.getUserDeactivationTicketCounts.mockResolvedValue({
                targetUserTicketCount: 0,
                reviewerTicketCount: 1,
            });

            mockUserService.findByUuid
                .mockResolvedValueOnce(userToDeactivate)
                .mockResolvedValueOnce(userToDeactivate)
                .mockResolvedValueOnce({ ...userToDeactivate, isActive: false });

            await service.deactivateWithTicketReassignment(mockAccessProfile, userToDeactivate.uuid, {
                newReviewerId: tenantAdmin.id,
            });

            expect(mockTicketService.reassignTicketsOnUserDeactivation).toHaveBeenCalledWith(
                mockAccessProfile,
                userToDeactivate.id,
                undefined,
                tenantAdmin.id,
            );
        });

        it('should reject deactivation when target user is required but missing', async () => {
            mockTicketService.getUserDeactivationTicketCounts.mockResolvedValue({
                targetUserTicketCount: 1,
                reviewerTicketCount: 0,
            });

            await expect(
                service.deactivateWithTicketReassignment(mockAccessProfile, userToDeactivate.uuid, {}),
            ).rejects.toMatchObject({
                response: expect.objectContaining({ code: 'new-target-user-required' }),
            });

            expect(mockTicketService.reassignTicketsOnUserDeactivation).not.toHaveBeenCalled();
            expect(mockUserService.update).not.toHaveBeenCalled();
        });

        it('should reject deactivation when target user is not in allowed options', async () => {
            mockTicketService.getUserDeactivationTicketCounts.mockResolvedValue({
                targetUserTicketCount: 1,
                reviewerTicketCount: 0,
            });

            await expect(
                service.deactivateWithTicketReassignment(mockAccessProfile, userToDeactivate.uuid, {
                    newTargetUserId: 999,
                }),
            ).rejects.toMatchObject({
                response: expect.objectContaining({ code: 'invalid-target-user' }),
            });
        });

        it('should reject deactivation when there are no target user options available', async () => {
            mockUserRepository.find.mockResolvedValue([]);
            mockUserService.getTenantAdmins.mockResolvedValue([]);
            mockTicketService.getUserDeactivationTicketCounts.mockResolvedValue({
                targetUserTicketCount: 1,
                reviewerTicketCount: 0,
            });

            await expect(
                service.deactivateWithTicketReassignment(mockAccessProfile, userToDeactivate.uuid, {
                    newTargetUserId: 11,
                }),
            ).rejects.toMatchObject({
                response: expect.objectContaining({ code: 'no-target-user-options' }),
            });
        });

        it('should reject deactivation when reviewer is required but missing', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);
            mockTicketService.getUserDeactivationTicketCounts.mockResolvedValue({
                targetUserTicketCount: 0,
                reviewerTicketCount: 1,
            });

            await expect(
                service.deactivateWithTicketReassignment(mockAccessProfile, userToDeactivate.uuid, {}),
            ).rejects.toMatchObject({
                response: expect.objectContaining({ code: 'new-reviewer-required' }),
            });
        });

        it('should reject deactivation when reviewer is not in allowed options', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);
            mockTicketService.getUserDeactivationTicketCounts.mockResolvedValue({
                targetUserTicketCount: 0,
                reviewerTicketCount: 1,
            });

            await expect(
                service.deactivateWithTicketReassignment(mockAccessProfile, userToDeactivate.uuid, {
                    newReviewerId: 999,
                }),
            ).rejects.toMatchObject({
                response: expect.objectContaining({ code: 'invalid-reviewer' }),
            });
        });

        it('should reject deactivation when no reviewer options are available', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);
            mockUserService.getTenantAdmins.mockResolvedValue([]);
            mockTicketService.getUserDeactivationTicketCounts.mockResolvedValue({
                targetUserTicketCount: 0,
                reviewerTicketCount: 1,
            });

            await expect(
                service.deactivateWithTicketReassignment(mockAccessProfile, userToDeactivate.uuid, {
                    newReviewerId: 20,
                }),
            ).rejects.toBeInstanceOf(CustomBadRequestException);
        });
    });
});
