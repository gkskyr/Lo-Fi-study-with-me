import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { AgoraService } from '../agora/agora.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtOptionalAuthGuard } from '../auth/guards/jwt-optional-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly agoraService: AgoraService,
  ) {}

  @Get()
  @UseGuards(JwtOptionalAuthGuard)
  findAll(@CurrentUser() user: User | null) {
    return this.roomsService.findAll(user?.id);
  }

  // Statik path (':id'den önce tanımlanmalı)
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  findMine(@CurrentUser() user: User) {
    return this.roomsService.findOrCreatePersonal(user.id);
  }

  @Get(':id')
  @UseGuards(JwtOptionalAuthGuard)
  findOne(@Param('id') id: string, @CurrentUser() user: User | null) {
    return this.roomsService.findOne(id, user?.id);
  }

  @Get(':id/agora-token')
  @UseGuards(JwtAuthGuard)
  async getAgoraToken(@Param('id') id: string, @CurrentUser() user: User) {
    await this.roomsService.findOne(id, user.id);
    return this.agoraService.generateRtcToken(id, user.id);
  }
}
