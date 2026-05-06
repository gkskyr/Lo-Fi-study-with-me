import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoomsGateway } from '../rooms/rooms.gateway';
import { CreateQuestionDto } from './dto/create-question.dto';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roomsGateway: RoomsGateway,
  ) {}

  async create(dto: CreateQuestionDto, authorId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: dto.roomId } });
    if (!room) throw new NotFoundException('Oda bulunamadı.');

    const question = await this.prisma.question.create({
      data: { content: dto.content, roomId: dto.roomId, authorId },
      include: { author: { select: { id: true, name: true } } },
    });

    this.roomsGateway.emitNewQuestion(dto.roomId, question);
    return question;
  }

  async findByRoom(roomId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Oda bulunamadı.');

    return this.prisma.question.findMany({
      where: { roomId },
      include: { author: { select: { id: true, name: true } } },
      orderBy: [{ upvotes: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async vote(questionId: string) {
    const question = await this.prisma.question.findUnique({ where: { id: questionId } });
    if (!question) throw new NotFoundException('Soru bulunamadı.');

    const updated = await this.prisma.question.update({
      where: { id: questionId },
      data: { upvotes: { increment: 1 } },
      include: { author: { select: { id: true, name: true } } },
    });

    this.roomsGateway.emitVoteUpdated(updated.roomId, { id: updated.id, upvotes: updated.upvotes });
    return updated;
  }
}
