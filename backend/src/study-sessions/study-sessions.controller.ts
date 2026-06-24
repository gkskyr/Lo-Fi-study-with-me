import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StudySessionsService } from './study-sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { CheckInDto } from './dto/checkin.dto';
import type { User } from '@prisma/client';

@ApiTags('Study Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('study-sessions')
export class StudySessionsController {
  constructor(private readonly service: StudySessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Yeni çalışma oturumu başlat' })
  create(@Body() dto: CreateSessionDto, @CurrentUser() user: User) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id/round')
  @ApiOperation({ summary: 'Tekrar tamamlandı — completedRounds arttır' })
  incrementRound(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.incrementRound(id, user.id);
  }

  @Post(':id/checkin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Denetim sonucu kaydet' })
  checkIn(@Param('id') id: string, @Body() dto: CheckInDto, @CurrentUser() user: User) {
    return this.service.addCheckIn(id, dto, user.id);
  }

  @Patch(':id/end')
  @ApiOperation({ summary: 'Oturumu bitir, XP hesapla' })
  end(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.end(id, user.id);
  }

  @Get('me')
  @ApiOperation({ summary: 'Kendi oturum geçmişini getir (son 20)' })
  findMine(@CurrentUser() user: User) {
    return this.service.findMine(user.id);
  }
}
