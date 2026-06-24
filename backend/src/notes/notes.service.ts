import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUnitDto, CreateTopicDto, CreateNoteDto, AutosaveNoteDto } from './dto/notes.dto';

const NOTE_LIMIT = 10;

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Ünite ──────────────────────────────────────────────────────────────────

  async getTree(userId: string) {
    return this.prisma.noteUnit.findMany({
      where: { userId },
      include: {
        topics: {
          include: { notes: { select: { id: true, title: true, order: true, updatedAt: true }, orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async createUnit(dto: CreateUnitDto, userId: string) {
    const count = await this.prisma.noteUnit.count({ where: { userId } });
    return this.prisma.noteUnit.create({
      data: { title: dto.title, userId, order: count },
    });
  }

  async updateUnit(unitId: string, dto: CreateUnitDto, userId: string) {
    await this.assertUnitOwner(unitId, userId);
    return this.prisma.noteUnit.update({ where: { id: unitId }, data: { title: dto.title } });
  }

  async deleteUnit(unitId: string, userId: string) {
    await this.assertUnitOwner(unitId, userId);
    await this.prisma.noteUnit.delete({ where: { id: unitId } });
  }

  // ── Konu Başlığı ───────────────────────────────────────────────────────────

  async createTopic(unitId: string, dto: CreateTopicDto, userId: string) {
    await this.assertUnitOwner(unitId, userId);
    const count = await this.prisma.noteTopic.count({ where: { unitId } });
    return this.prisma.noteTopic.create({
      data: { title: dto.title, unitId, order: count },
    });
  }

  async updateTopic(topicId: string, dto: CreateTopicDto, userId: string) {
    await this.assertTopicOwner(topicId, userId);
    return this.prisma.noteTopic.update({ where: { id: topicId }, data: { title: dto.title } });
  }

  async deleteTopic(topicId: string, userId: string) {
    await this.assertTopicOwner(topicId, userId);
    await this.prisma.noteTopic.delete({ where: { id: topicId } });
  }

  // ── Not ────────────────────────────────────────────────────────────────────

  async createNote(topicId: string, dto: CreateNoteDto, userId: string) {
    await this.assertTopicOwner(topicId, userId);

    const total = await this.prisma.note.count({
      where: { topic: { unit: { userId } } },
    });
    if (total >= NOTE_LIMIT) {
      throw new ForbiddenException(`Not defteri dolu (maks ${NOTE_LIMIT} sayfa).`);
    }

    const count = await this.prisma.note.count({ where: { topicId } });
    return this.prisma.note.create({
      data: {
        title: dto.title,
        topicId,
        order: count,
        // Boş Tiptap belgesi
        content: { type: 'doc', content: [{ type: 'paragraph' }] },
      },
    });
  }

  async getNote(noteId: string, userId: string) {
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
      include: { topic: { include: { unit: true } } },
    });
    if (!note) throw new NotFoundException('Not bulunamadı.');
    if (note.topic.unit.userId !== userId) throw new ForbiddenException();
    return note;
  }

  // Otosave — title ve/veya content günceller, 200ms debounce frontend'de yapılmalı
  async autosave(noteId: string, dto: AutosaveNoteDto, userId: string) {
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
      include: { topic: { include: { unit: { select: { userId: true } } } } },
    });
    if (!note) throw new NotFoundException('Not bulunamadı.');
    if (note.topic.unit.userId !== userId) throw new ForbiddenException();

    return this.prisma.note.update({
      where: { id: noteId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && {
          content: dto.content as Prisma.InputJsonValue,
        }),
      },
      select: { id: true, title: true, updatedAt: true },
    });
  }

  async deleteNote(noteId: string, userId: string) {
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
      include: { topic: { include: { unit: { select: { userId: true } } } } },
    });
    if (!note) throw new NotFoundException('Not bulunamadı.');
    if (note.topic.unit.userId !== userId) throw new ForbiddenException();
    await this.prisma.note.delete({ where: { id: noteId } });
  }

  // ── Guard yardımcıları ─────────────────────────────────────────────────────

  private async assertUnitOwner(unitId: string, userId: string) {
    const unit = await this.prisma.noteUnit.findUnique({ where: { id: unitId } });
    if (!unit) throw new NotFoundException('Ünite bulunamadı.');
    if (unit.userId !== userId) throw new ForbiddenException();
  }

  private async assertTopicOwner(topicId: string, userId: string) {
    const topic = await this.prisma.noteTopic.findUnique({
      where: { id: topicId },
      include: { unit: { select: { userId: true } } },
    });
    if (!topic) throw new NotFoundException('Konu bulunamadı.');
    if (topic.unit.userId !== userId) throw new ForbiddenException();
  }
}
