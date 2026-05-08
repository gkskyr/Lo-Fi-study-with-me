import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateUnitDto, CreateTopicDto, CreateNoteDto, AutosaveNoteDto } from './dto/notes.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  // Tüm ağacı tek seferde getir (Ünite > Konu > Not listesi)
  @Get()
  getTree(@CurrentUser() user: User) {
    return this.notesService.getTree(user.id);
  }

  // ── Üniteler ────────────────────────────────────────────────────────────────
  @Post('units')
  createUnit(@Body() dto: CreateUnitDto, @CurrentUser() user: User) {
    return this.notesService.createUnit(dto, user.id);
  }

  @Patch('units/:id')
  updateUnit(@Param('id') id: string, @Body() dto: CreateUnitDto, @CurrentUser() user: User) {
    return this.notesService.updateUnit(id, dto, user.id);
  }

  @Delete('units/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUnit(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notesService.deleteUnit(id, user.id);
  }

  // ── Konu Başlıkları ─────────────────────────────────────────────────────────
  @Post('units/:unitId/topics')
  createTopic(
    @Param('unitId') unitId: string,
    @Body() dto: CreateTopicDto,
    @CurrentUser() user: User,
  ) {
    return this.notesService.createTopic(unitId, dto, user.id);
  }

  @Patch('topics/:id')
  updateTopic(@Param('id') id: string, @Body() dto: CreateTopicDto, @CurrentUser() user: User) {
    return this.notesService.updateTopic(id, dto, user.id);
  }

  @Delete('topics/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTopic(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notesService.deleteTopic(id, user.id);
  }

  // ── Notlar ──────────────────────────────────────────────────────────────────
  @Post('topics/:topicId/notes')
  createNote(
    @Param('topicId') topicId: string,
    @Body() dto: CreateNoteDto,
    @CurrentUser() user: User,
  ) {
    return this.notesService.createNote(topicId, dto, user.id);
  }

  @Get(':id')
  getNote(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notesService.getNote(id, user.id);
  }

  // Otosave — PATCH /notes/:id  { title?, content? }
  @Patch(':id')
  autosave(@Param('id') id: string, @Body() dto: AutosaveNoteDto, @CurrentUser() user: User) {
    return this.notesService.autosave(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteNote(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notesService.deleteNote(id, user.id);
  }
}
