import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoomsGateway } from '../rooms/rooms.gateway';
import { XpService, XP_REWARDS } from '../xp/xp.service';
import { CreateQuestionDto } from './dto/create-question.dto';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roomsGateway: RoomsGateway,
    private readonly xpService: XpService,
  ) {}

  async create(dto: CreateQuestionDto, files: Express.Multer.File[], authorId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: dto.roomId } });
    if (!room) throw new NotFoundException('Oda bulunamadı.');

    const trimmed = dto.content?.trim();
    if (!trimmed && (!files || files.length === 0)) {
      throw new BadRequestException('En az bir metin veya resim gereklidir.');
    }

    const question = await this.prisma.question.create({
      data: {
        content: trimmed || null,
        roomId: dto.roomId,
        authorId,
        media: {
          create: files.map((f) => ({ url: `/uploads/${f.filename}`, mimeType: f.mimetype })),
        },
      },
      include: {
        author: { select: { id: true, name: true } },
        media: true,
        _count: { select: { answers: true } },
      },
    });

    this.roomsGateway.emitNewQuestion(dto.roomId, question);

    // XP: soru sorma
    const xpResult = await this.xpService.award(authorId, XP_REWARDS.ASK_QUESTION);
    this.roomsGateway.emitXpToUser(authorId, xpResult);

    return question;
  }

  async findByRoom(roomId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Oda bulunamadı.');

    return this.prisma.question.findMany({
      where: { roomId },
      include: {
        author: { select: { id: true, name: true } },
        media: true,
        _count: { select: { answers: true } },
      },
      orderBy: [{ upvotes: 'desc' }, { createdAt: 'asc' }],
    });
  }

  // Toggle: oy yoksa ekle, varsa geri çek
  async vote(questionId: string, userId: string) {
    const question = await this.prisma.question.findUnique({ where: { id: questionId } });
    if (!question) throw new NotFoundException('Soru bulunamadı.');

    const existing = await this.prisma.questionVote.findUnique({
      where: { userId_questionId: { userId, questionId } },
    });

    if (existing) {
      await this.prisma.questionVote.delete({ where: { id: existing.id } });
      const updated = await this.prisma.question.update({
        where: { id: questionId },
        data: { upvotes: { decrement: 1 } },
        include: { author: { select: { id: true, name: true } } },
      });
      this.roomsGateway.emitVoteUpdated(updated.roomId, { id: updated.id, upvotes: updated.upvotes, voted: false });
      return { ...updated, voted: false };
    }

    await this.prisma.questionVote.create({ data: { userId, questionId } });
    const updated = await this.prisma.question.update({
      where: { id: questionId },
      data: { upvotes: { increment: 1 } },
      include: { author: { select: { id: true, name: true } } },
    });
    this.roomsGateway.emitVoteUpdated(updated.roomId, { id: updated.id, upvotes: updated.upvotes, voted: true });
    return { ...updated, voted: true };
  }

  async createAnswer(
    questionId: string,
    content: string | undefined,
    files: Express.Multer.File[],
    authorId: string,
  ) {
    const question = await this.prisma.question.findUnique({ where: { id: questionId } });
    if (!question) throw new NotFoundException('Soru bulunamadı.');

    const trimmed = content?.trim();
    if (!trimmed && (!files || files.length === 0)) {
      throw new BadRequestException('En az bir metin veya resim gereklidir.');
    }

    const answer = await this.prisma.answer.create({
      data: {
        content: trimmed || null,
        questionId,
        authorId,
        media: {
          create: files.map((f) => ({
            url: `/uploads/${f.filename}`,
            mimeType: f.mimetype,
          })),
        },
      },
      include: {
        author: { select: { id: true, name: true } },
        media: true,
      },
    });

    this.roomsGateway.emitNewAnswer(question.roomId, answer);

    // XP: cevap verme
    const xpResult = await this.xpService.award(authorId, XP_REWARDS.ANSWER_QUESTION);
    this.roomsGateway.emitXpToUser(authorId, xpResult);

    return answer;
  }

  async findAnswers(questionId: string) {
    const question = await this.prisma.question.findUnique({ where: { id: questionId } });
    if (!question) throw new NotFoundException('Soru bulunamadı.');

    return this.prisma.answer.findMany({
      where: { questionId },
      include: {
        author: { select: { id: true, name: true } },
        media: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
