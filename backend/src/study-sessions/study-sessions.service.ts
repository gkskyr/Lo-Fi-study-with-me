import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { XpService } from '../xp/xp.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { CheckInDto } from './dto/checkin.dto';

@Injectable()
export class StudySessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xpService: XpService,
  ) {}

  async create(dto: CreateSessionDto, userId: string) {
    return this.prisma.studySession.create({
      data: { ...dto, userId },
    });
  }

  async incrementRound(id: string, userId: string) {
    const session = await this.prisma.studySession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Oturum bulunamadı.');
    if (session.userId !== userId) throw new ForbiddenException('Bu oturuma erişim yetkiniz yok.');

    return this.prisma.studySession.update({
      where: { id },
      data: { completedRounds: { increment: 1 } },
    });
  }

  async addCheckIn(id: string, dto: CheckInDto, userId: string) {
    const session = await this.prisma.studySession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Oturum bulunamadı.');
    if (session.userId !== userId) throw new ForbiddenException('Bu oturuma erişim yetkiniz yok.');

    return this.prisma.sessionCheckIn.create({
      data: { sessionId: id, ...dto },
    });
  }

  async end(id: string, userId: string) {
    const session = await this.prisma.studySession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Oturum bulunamadı.');
    if (session.userId !== userId) throw new ForbiddenException('Bu oturuma erişim yetkiniz yok.');

    const checkIns = await this.prisma.sessionCheckIn.findMany({ where: { sessionId: id } });
    const passedCount = checkIns.filter(c => c.passed).length;

    const baseXp = session.completedRounds * 10;
    const monitoringBonus = checkIns.length > 0
      ? Math.round((passedCount / checkIns.length) * session.completedRounds * 5)
      : 0;
    const totalXp = baseXp + monitoringBonus;

    const xpResult = await this.xpService.award(userId, totalXp);

    const updated = await this.prisma.studySession.update({
      where: { id },
      data: { endedAt: new Date(), xpAwarded: totalXp },
      include: { checkIns: true },
    });

    return { ...updated, xpResult };
  }

  async findMine(userId: string) {
    return this.prisma.studySession.findMany({
      where: { userId },
      include: { checkIns: true },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });
  }
}
