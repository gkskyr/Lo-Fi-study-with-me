import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface XpResult {
  xp: number;
  role: Role;
  leveledUp: boolean;
  newRole?: Role;
}

export const XP_REWARDS = {
  ASK_QUESTION: 5,
  ANSWER_QUESTION: 10,
  ROOM_HOUR: 20,
} as const;

// Eşikleri geçince rol yükselir, asla düşmez
const ROLE_THRESHOLDS: { role: Role; minXp: number }[] = [
  { role: Role.EXPERIENCED, minXp: 500 },
  { role: Role.INSTRUCTOR, minXp: 2000 },
];

const ROLE_RANK: Record<Role, number> = {
  BEGINNER: 0,
  EXPERIENCED: 1,
  INSTRUCTOR: 2,
};

@Injectable()
export class XpService {
  constructor(private readonly prisma: PrismaService) {}

  async award(userId: string, amount: number): Promise<XpResult> {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: amount } },
      select: { xp: true, role: true },
    });

    const targetRole = ROLE_THRESHOLDS.filter(t => updated.xp >= t.minXp).pop()?.role;

    if (targetRole && ROLE_RANK[targetRole] > ROLE_RANK[updated.role]) {
      await this.prisma.user.update({ where: { id: userId }, data: { role: targetRole } });
      return { xp: updated.xp, role: targetRole, leveledUp: true, newRole: targetRole };
    }

    return { xp: updated.xp, role: updated.role, leveledUp: false };
  }
}
