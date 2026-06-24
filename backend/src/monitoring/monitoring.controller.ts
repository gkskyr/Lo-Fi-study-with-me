import {
  Controller, Post, Get, Delete,
  UseGuards, UseInterceptors,
  UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MonitoringService } from './monitoring.service';
import type { User } from '@prisma/client';

const imageFilter = (_req: unknown, file: Express.Multer.File, cb: (e: Error | null, accept: boolean) => void) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new BadRequestException('Sadece görsel dosyaları kabul edilir.'), false);
  }
  cb(null, true);
};

@ApiTags('Monitoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly service: MonitoringService) {}

  @Post('calibrate')
  @ApiOperation({ summary: 'PC denetim referansını kaydet' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: imageFilter }))
  calibrate(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: User) {
    if (!file) throw new BadRequestException('Görsel gerekli.');
    return this.service.calibrate(file.buffer, user.id);
  }

  @Post('check')
  @ApiOperation({ summary: 'Ekran görüntüsünü referansla karşılaştır' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('screenshot', { limits: { fileSize: 20 * 1024 * 1024 }, fileFilter: imageFilter }))
  check(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: User) {
    if (!file) throw new BadRequestException('Ekran görüntüsü gerekli.');
    return this.service.check(file.buffer, user.id);
  }

  @Get('status')
  @ApiOperation({ summary: 'Kullanıcının kalibrasyon durumunu getir' })
  status(@CurrentUser() user: User) {
    return this.service.getStatus(user.id);
  }

  @Delete('calibration')
  @ApiOperation({ summary: 'Kalibrasyon verisini sil' })
  deleteCalibration(@CurrentUser() user: User) {
    return this.service.deleteCalibration(user.id);
  }
}
