import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { StudyMethod, MonitoringType } from '@prisma/client';
import { StudySessionsService } from './study-sessions.service';
import { PrismaService } from '../prisma/prisma.service';
import { XpService } from '../xp/xp.service';

const mockPrisma = {
  studySession: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  sessionCheckIn: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockXpService = { award: jest.fn() };

describe('StudySessionsService', () => {
  let service: StudySessionsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudySessionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: XpService, useValue: mockXpService },
      ],
    }).compile();
    service = module.get<StudySessionsService>(StudySessionsService);
  });

  describe('create', () => {
    it('creates a study session for the given user', async () => {
      const dto = {
        topic: 'Matematik',
        method: StudyMethod.POMODORO,
        workMinutes: 25,
        breakMinutes: 5,
        totalRounds: 5,
        monitoringType: MonitoringType.NONE,
      };
      const created = { id: 'sess-1', ...dto, userId: 'user-1', completedRounds: 0 };
      mockPrisma.studySession.create.mockResolvedValue(created);

      const result = await service.create(dto, 'user-1');

      expect(mockPrisma.studySession.create).toHaveBeenCalledWith({
        data: { ...dto, userId: 'user-1' },
      });
      expect(result).toEqual(created);
    });
  });

  describe('incrementRound', () => {
    it('increments completedRounds for own session', async () => {
      mockPrisma.studySession.findUnique.mockResolvedValue({ id: 'sess-1', userId: 'user-1' });
      const updated = { id: 'sess-1', completedRounds: 1 };
      mockPrisma.studySession.update.mockResolvedValue(updated);

      const result = await service.incrementRound('sess-1', 'user-1');

      expect(mockPrisma.studySession.update).toHaveBeenCalledWith({
        where: { id: 'sess-1' },
        data: { completedRounds: { increment: 1 } },
      });
      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when session does not exist', async () => {
      mockPrisma.studySession.findUnique.mockResolvedValue(null);
      await expect(service.incrementRound('x', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when session belongs to another user', async () => {
      mockPrisma.studySession.findUnique.mockResolvedValue({ id: 'sess-1', userId: 'other' });
      await expect(service.incrementRound('sess-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addCheckIn', () => {
    it('creates a check-in record for own session', async () => {
      mockPrisma.studySession.findUnique.mockResolvedValue({ id: 'sess-1', userId: 'user-1' });
      const dto = { round: 1, passed: true, monitoringType: MonitoringType.NOTEBOOK };
      const created = { id: 'ci-1', sessionId: 'sess-1', ...dto };
      mockPrisma.sessionCheckIn.create.mockResolvedValue(created);

      const result = await service.addCheckIn('sess-1', dto, 'user-1');

      expect(mockPrisma.sessionCheckIn.create).toHaveBeenCalledWith({
        data: { sessionId: 'sess-1', ...dto },
      });
      expect(result).toEqual(created);
    });

    it('throws ForbiddenException when session belongs to another user', async () => {
      mockPrisma.studySession.findUnique.mockResolvedValue({ id: 'sess-1', userId: 'other' });
      await expect(
        service.addCheckIn('sess-1', { round: 1, passed: true, monitoringType: MonitoringType.NOTEBOOK }, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('end — XP calculation', () => {
    it('awards baseXp only when there are no check-ins', async () => {
      mockPrisma.studySession.findUnique.mockResolvedValue({ id: 's', userId: 'u', completedRounds: 3 });
      mockPrisma.sessionCheckIn.findMany.mockResolvedValue([]);
      mockXpService.award.mockResolvedValue({ xp: 30, role: 'BEGINNER', leveledUp: false });
      mockPrisma.studySession.update.mockResolvedValue({ id: 's', xpAwarded: 30 });

      await service.end('s', 'u');

      // baseXp = 3*10 = 30, monitoringBonus = 0
      expect(mockXpService.award).toHaveBeenCalledWith('u', 30);
    });

    it('awards full bonus when all check-ins passed', async () => {
      mockPrisma.studySession.findUnique.mockResolvedValue({ id: 's', userId: 'u', completedRounds: 4 });
      mockPrisma.sessionCheckIn.findMany.mockResolvedValue([
        { passed: true }, { passed: true }, { passed: true }, { passed: true },
      ]);
      mockXpService.award.mockResolvedValue({ xp: 60, role: 'BEGINNER', leveledUp: false });
      mockPrisma.studySession.update.mockResolvedValue({ id: 's', xpAwarded: 60 });

      await service.end('s', 'u');

      // baseXp = 40, monitoringBonus = round(4/4 * 4*5) = 20 → 60
      expect(mockXpService.award).toHaveBeenCalledWith('u', 60);
    });

    it('awards partial bonus when half check-ins passed', async () => {
      mockPrisma.studySession.findUnique.mockResolvedValue({ id: 's', userId: 'u', completedRounds: 4 });
      mockPrisma.sessionCheckIn.findMany.mockResolvedValue([
        { passed: true }, { passed: false }, { passed: true }, { passed: false },
      ]);
      mockXpService.award.mockResolvedValue({ xp: 50, role: 'BEGINNER', leveledUp: false });
      mockPrisma.studySession.update.mockResolvedValue({ id: 's', xpAwarded: 50 });

      await service.end('s', 'u');

      // baseXp = 40, monitoringBonus = round(2/4 * 4*5) = 10 → 50
      expect(mockXpService.award).toHaveBeenCalledWith('u', 50);
    });
  });

  describe('findMine', () => {
    it('returns last 20 sessions ordered by startedAt desc', async () => {
      const sessions = [{ id: 's1' }, { id: 's2' }];
      mockPrisma.studySession.findMany.mockResolvedValue(sessions);

      const result = await service.findMine('user-1');

      expect(mockPrisma.studySession.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { checkIns: true },
        orderBy: { startedAt: 'desc' },
        take: 20,
      });
      expect(result).toEqual(sessions);
    });
  });
});
