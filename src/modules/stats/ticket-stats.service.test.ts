import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TicketStatsService } from './ticket-stats.service';
import { TicketStats } from './entities/ticket-stats.entity';
import { Ticket, TicketPriority, TicketStatus } from '../ticket/entities/ticket.entity';
import { TicketUpdate } from '../ticket-updates/entities/ticket-update.entity';
import { User } from '../user/entities/user.entity';
import { AccessProfile } from '../../shared/common/access-profile';
import { DepartmentService } from '../department/department.service';
import { BusinessHoursService } from '../../shared/services/business-hours.service';
import { RoleService } from '../role/role.service';
import { StatsPeriod } from './stats.controller';
import { RoleName } from '../role/entities/role.entity';

describe('TicketStatsService', () => {
    let service: TicketStatsService;

    const mockAccessProfile: AccessProfile = new AccessProfile({
        tenantId: 1,
        userId: 1,
        roleId: 1,
    });

    const mockTicketStatsRepository = {
        findAndCount: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };

    const mockTicketRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
        createQueryBuilder: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
    };

    const mockTicketUpdateRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    const mockUserRepository = {
        findOne: jest.fn(),
        find: jest.fn(),
    };

    const mockDepartmentService = {
        findMany: jest.fn(),
    };

    const mockBusinessHoursService = {
        calculateBusinessTime: jest.fn(),
    };

    const mockRoleService = {
        findById: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TicketStatsService,
                {
                    provide: getRepositoryToken(TicketStats),
                    useValue: mockTicketStatsRepository,
                },
                {
                    provide: getRepositoryToken(Ticket),
                    useValue: mockTicketRepository,
                },
                {
                    provide: getRepositoryToken(TicketUpdate),
                    useValue: mockTicketUpdateRepository,
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: mockUserRepository,
                },
                {
                    provide: DepartmentService,
                    useValue: mockDepartmentService,
                },
                {
                    provide: BusinessHoursService,
                    useValue: mockBusinessHoursService,
                },
                {
                    provide: RoleService,
                    useValue: mockRoleService,
                },
            ],
        }).compile();

        service = module.get<TicketStatsService>(TicketStatsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findMany', () => {
        it('should return paginated ticket stats', async () => {
            const mockStats = [
                { id: 1, ticketId: 1, tenantId: 1 },
                { id: 2, ticketId: 2, tenantId: 1 },
            ];
            const total = 2;

            mockTicketStatsRepository.findAndCount.mockResolvedValue([mockStats, total]);

            const result = await service.findMany(mockAccessProfile, {
                page: 1,
                limit: 10,
            });

            expect(result.items).toEqual(mockStats);
            expect(result.total).toBe(total);
            expect(result.page).toBe(1);
            expect(result.limit).toBe(10);
            expect(mockTicketStatsRepository.findAndCount).toHaveBeenCalledWith({
                where: { tenantId: mockAccessProfile.tenantId },
                order: { createdAt: 'DESC' },
                page: 1,
                limit: 10,
            });
        });

        it('should filter by tenantId', async () => {
            const mockStats = [{ id: 1, ticketId: 1, tenantId: 1 }];
            mockTicketStatsRepository.findAndCount.mockResolvedValue([mockStats, 1]);

            await service.findMany(mockAccessProfile);

            expect(mockTicketStatsRepository.findAndCount).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        tenantId: mockAccessProfile.tenantId,
                    }),
                }),
            );
        });
    });

    describe('findByTicketId', () => {
        it('should return ticket stats for a specific ticket', async () => {
            const ticketId = 1;
            const mockStat = { id: 1, ticketId, tenantId: 1 };

            mockTicketStatsRepository.findOne.mockResolvedValue(mockStat);

            const result = await service.findByTicketId(mockAccessProfile, ticketId);

            expect(result).toEqual(mockStat);
            expect(mockTicketStatsRepository.findOne).toHaveBeenCalledWith({
                where: { ticketId, tenantId: mockAccessProfile.tenantId },
            });
        });

        it('should return null when ticket stats not found', async () => {
            mockTicketStatsRepository.findOne.mockResolvedValue(null);

            const result = await service.findByTicketId(mockAccessProfile, 999);

            expect(result).toBeNull();
        });
    });

    describe('getSupervisorDepartmentId', () => {
        it('should return departmentId for Supervisor user', async () => {
            const mockUser = { id: 1, tenantId: 1, roleId: 1, departmentId: 5 };
            const mockRole = { id: 1, name: RoleName.Supervisor };

            mockUserRepository.findOne.mockResolvedValue(mockUser);
            mockRoleService.findById.mockResolvedValue(mockRole);

            // Access private method through reflection or make it public for testing
            const result = await (service as any).getSupervisorDepartmentId(mockAccessProfile);

            expect(result).toBe(5);
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { id: mockAccessProfile.userId, tenantId: mockAccessProfile.tenantId },
            });
            expect(mockRoleService.findById).toHaveBeenCalledWith(mockUser.roleId);
        });

        it('should return null for non-Supervisor user', async () => {
            const mockUser = { id: 1, tenantId: 1, roleId: 1, departmentId: 5 };
            const mockRole = { id: 1, name: RoleName.TenantAdmin };

            mockUserRepository.findOne.mockResolvedValue(mockUser);
            mockRoleService.findById.mockResolvedValue(mockRole);

            const result = await (service as any).getSupervisorDepartmentId(mockAccessProfile);

            expect(result).toBeNull();
        });

        it('should return null when user not found', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);

            const result = await (service as any).getSupervisorDepartmentId(mockAccessProfile);

            expect(result).toBeNull();
        });
    });

    describe('getTenantStats', () => {
        it('should calculate stats for ALL period', async () => {
            const mockStats = [
                {
                    id: 1,
                    isResolved: true,
                    totalTimeSeconds: 3600,
                    acceptanceTimeSeconds: 1800,
                },
                {
                    id: 2,
                    isResolved: false,
                    totalTimeSeconds: null,
                    acceptanceTimeSeconds: 900,
                },
            ];

            mockTicketStatsRepository.findAndCount.mockResolvedValue([mockStats, 2]);
            mockUserRepository.findOne.mockResolvedValue(null);
            // Mock applyWeekendExclusion by spying on the service
            jest.spyOn(service as any, 'applyWeekendExclusion').mockResolvedValue(mockStats);

            const result = await service.getTenantStats(mockAccessProfile, StatsPeriod.ALL);

            expect(result.totalTickets).toBe(2);
            expect(result.resolvedTickets).toBe(1);
            expect(result.closedTickets).toBe(1);
            expect(result.openTickets).toBe(1);
            expect(result.averageResolutionTimeSeconds).toBe(3600);
            expect(result.averageAcceptanceTimeSeconds).toBe(1350); // (1800 + 900) / 2
            expect(result.resolutionRate).toBe(1.0); // 1 resolved / 1 closed
        });

        it('should calculate stats for WEEKLY period', async () => {
            const mockStats = [
                {
                    id: 1,
                    isResolved: true,
                    totalTimeSeconds: 7200,
                    acceptanceTimeSeconds: 3600,
                },
            ];

            mockTicketStatsRepository.findAndCount.mockResolvedValue([mockStats, 1]);
            mockUserRepository.findOne.mockResolvedValue(null);
            jest.spyOn(service as any, 'applyWeekendExclusion').mockResolvedValue(mockStats);

            const result = await service.getTenantStats(mockAccessProfile, StatsPeriod.WEEKLY);

            expect(result.totalTickets).toBe(1);
            expect(result.resolvedTickets).toBe(1);
            expect(mockTicketStatsRepository.findAndCount).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        tenantId: mockAccessProfile.tenantId,
                        createdAt: expect.anything(),
                    }),
                }),
            );
        });

        it('should filter by department for Supervisor', async () => {
            const mockUser = { id: 1, tenantId: 1, roleId: 1, departmentId: 5 };
            const mockRole = { id: 1, name: RoleName.Supervisor };
            const mockStats = [
                {
                    id: 1,
                    isResolved: true,
                    totalTimeSeconds: 3600,
                    acceptanceTimeSeconds: 1800,
                    departmentIds: [5],
                },
                {
                    id: 2,
                    isResolved: false,
                    totalTimeSeconds: null,
                    acceptanceTimeSeconds: 900,
                    departmentIds: [3],
                },
            ];

            mockUserRepository.findOne.mockResolvedValue(mockUser);
            mockRoleService.findById.mockResolvedValue(mockRole);
            mockTicketStatsRepository.findAndCount.mockResolvedValue([mockStats, 2]);
            jest.spyOn(service as any, 'applyWeekendExclusion').mockResolvedValue([mockStats[0]]); // Only return first stat (department 5)

            const result = await service.getTenantStats(mockAccessProfile, StatsPeriod.ALL);

            expect(result.totalTickets).toBe(1); // Only department 5
            expect(result.resolvedTickets).toBe(1);
        });

        it('should handle zero resolution rate correctly', async () => {
            const mockStats = [
                {
                    id: 1,
                    isResolved: false,
                    totalTimeSeconds: null,
                    acceptanceTimeSeconds: 1800,
                },
            ];

            mockTicketStatsRepository.findAndCount.mockResolvedValue([mockStats, 1]);
            mockUserRepository.findOne.mockResolvedValue(null);
            jest.spyOn(service as any, 'applyWeekendExclusion').mockResolvedValue(mockStats);

            const result = await service.getTenantStats(mockAccessProfile, StatsPeriod.ALL);

            expect(result.resolutionRate).toBe(0);
            expect(result.closedTickets).toBe(0);
        });
    });

    describe('getTicketsByStatus', () => {
        it('should return ticket counts grouped by status', async () => {
            const mockQueryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([
                    { id: 1, ticketStatus: { key: TicketStatus.Pending } },
                    { id: 2, ticketStatus: { key: TicketStatus.InProgress } },
                    { id: 3, ticketStatus: { key: TicketStatus.Pending } },
                ]),
            };

            mockTicketRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
            mockUserRepository.findOne.mockResolvedValue(null);

            const result = await service.getTicketsByStatus(mockAccessProfile);

            expect(result.total).toBe(3);
            expect(result.statusCounts).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ status: TicketStatus.Pending, count: 2 }),
                    expect.objectContaining({ status: TicketStatus.InProgress, count: 1 }),
                ]),
            );
        });

        it('should filter by department for Supervisor', async () => {
            const mockUser = { id: 1, tenantId: 1, roleId: 1, departmentId: 5 };
            const mockRole = { id: 1, name: RoleName.Supervisor };
            const mockQueryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest
                    .fn()
                    .mockResolvedValue([{ id: 1, ticketStatus: { key: TicketStatus.Pending } }]),
            };

            mockUserRepository.findOne.mockResolvedValue(mockUser);
            mockRoleService.findById.mockResolvedValue(mockRole);
            mockTicketRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            await service.getTicketsByStatus(mockAccessProfile);

            expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
        });
    });

    describe('getTicketsByPriority', () => {
        it('should return ticket counts grouped by priority', async () => {
            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([
                    { id: 1, priority: TicketPriority.High },
                    { id: 2, priority: TicketPriority.Medium },
                    { id: 3, priority: TicketPriority.High },
                ]),
            };

            mockTicketRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
            mockUserRepository.findOne.mockResolvedValue(null);

            const result = await service.getTicketsByPriority(mockAccessProfile);

            expect(result.total).toBe(3);
            expect(result.priorityCounts).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ priority: TicketPriority.High, count: 2 }),
                    expect.objectContaining({ priority: TicketPriority.Medium, count: 1 }),
                ]),
            );
        });
    });

    describe('calculateAverage', () => {
        it('should calculate average of valid numbers', () => {
            const values = [10, 20, 30, null, undefined, 40];
            const result = (service as any).calculateAverage(values);
            expect(result).toBe(25); // (10 + 20 + 30 + 40) / 4
        });

        it('should return 0 for empty array', () => {
            const result = (service as any).calculateAverage([]);
            expect(result).toBe(0);
        });

        it('should return 0 for array with only null/undefined', () => {
            const result = (service as any).calculateAverage([null, undefined, null]);
            expect(result).toBe(0);
        });
    });
});
