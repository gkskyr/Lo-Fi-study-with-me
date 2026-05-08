import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { RoomType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoomDto, ownerId: string) {
    return this.prisma.room.create({
      data: { title: dto.title, type: dto.type, ownerId },
      include: { owner: { select: { id: true, name: true } } },
    });
  }

  // Kural: COMMUNITY odalar herkese açık.
  // PERSONAL odalar yalnızca sahibine görünür.
  async findAll(currentUserId?: string) {
    return this.prisma.room.findMany({
      where: {
        OR: [
          { type: RoomType.COMMUNITY },
          ...(currentUserId ? [{ type: RoomType.PERSONAL, ownerId: currentUserId }] : []),
        ],
      },
      include: { owner: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOrCreatePersonal(userId: string) {
    const existing = await this.prisma.room.findFirst({
      where: { type: RoomType.PERSONAL, ownerId: userId },
      include: { owner: { select: { id: true, name: true } } },
    });
    if (existing) return existing;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return this.prisma.room.create({
      data: {
        title: `${user?.name ?? 'Kullanıcı'}'ın Odası`,
        type: RoomType.PERSONAL,
        ownerId: userId,
      },
      include: { owner: { select: { id: true, name: true } } },
    });
  }

  async findOne(id: string, currentUserId?: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true } } },
    });

    if (!room) throw new NotFoundException('Oda bulunamadı.');

    if (room.type === RoomType.PERSONAL && room.ownerId !== currentUserId) {
      throw new ForbiddenException('Bu odaya erişim yetkiniz yok.');
    }

    return room;
  }
}
