import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@Controller()
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post('questions')
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateQuestionDto, @CurrentUser() user: User) {
    return this.questionsService.create(dto, user.id);
  }

  @Get('rooms/:id/questions')
  findByRoom(@Param('id') id: string) {
    return this.questionsService.findByRoom(id);
  }

  @Post('questions/:id/vote')
  @UseGuards(JwtAuthGuard)
  vote(@Param('id') id: string) {
    return this.questionsService.vote(id);
  }
}
