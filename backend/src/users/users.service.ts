import { Injectable } from '@nestjs/common';
import { RoomType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async create(data: { email: string; password: string; name: string; username: string }) {
    return this.prisma.user.create({ data });
  }

  async setVerificationCode(email: string, code: string, expiry: Date) {
    return this.prisma.user.update({
      where: { email },
      data: { emailVerificationCode: code, emailVerificationExpiry: expiry },
    });
  }

  async verifyEmail(email: string) {
    return this.prisma.user.update({
      where: { email },
      data: {
        isEmailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpiry: null,
      },
    });
  }

  async createPersonalRoom(userId: string, userName: string) {
    return this.prisma.room.create({
      data: { title: `${userName}'ın Odası`, type: RoomType.PERSONAL, ownerId: userId },
    });
  }

  // ── Refresh Token ───────────────────────────────────────────────────────────

  async saveRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    return this.prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  }

  async findRefreshToken(tokenHash: string) {
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  }

  async deleteRefreshToken(tokenHash: string) {
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
  }

  async deleteAllRefreshTokens(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async deleteExpiredRefreshTokens(userId: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId, expiresAt: { lt: new Date() } },
    });
  }
}
