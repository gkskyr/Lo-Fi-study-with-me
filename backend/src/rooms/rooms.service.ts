import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { RoomType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ı/g, 'i')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoomDto, ownerId: string) {
    const base = slugify(dto.title);
    // Slug çakışmasını önlemek için suffix ekle
    let slug = base;
    let suffix = 2;
    while (await this.prisma.room.findUnique({ where: { slug } })) {
      slug = `${base}-${suffix++}`;
    }

    return this.prisma.room.create({
      data: { title: dto.title, slug, type: dto.type, ownerId },
      include: { owner: { select: { id: true, name: true } } },
    });
  }

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
    const title = `${user?.name ?? 'Kullanıcı'}'ın Odası`;
    const base = slugify(title);
    let slug = base;
    let suffix = 2;
    while (await this.prisma.room.findUnique({ where: { slug } })) {
      slug = `${base}-${suffix++}`;
    }

    return this.prisma.room.create({
      data: { title, slug, type: RoomType.PERSONAL, ownerId: userId },
      include: { owner: { select: { id: true, name: true } } },
    });
  }

  async findOne(idOrSlug: string, currentUserId?: string) {
    const room = UUID_RE.test(idOrSlug)
      ? await this.prisma.room.findUnique({
          where: { id: idOrSlug },
          include: { owner: { select: { id: true, name: true } } },
        })
      : await this.prisma.room.findUnique({
          where: { slug: idOrSlug },
          include: { owner: { select: { id: true, name: true } } },
        });

    if (!room) throw new NotFoundException('Oda bulunamadı.');

    if (room.type === RoomType.PERSONAL && room.ownerId !== currentUserId) {
      throw new ForbiddenException('Bu odaya erişim yetkiniz yok.');
    }

    return room;
  }
}
