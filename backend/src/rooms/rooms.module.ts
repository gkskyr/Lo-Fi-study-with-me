import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { RoomsGateway } from './rooms.gateway';
import { AgoraService } from '../agora/agora.service';
import { AuthModule } from '../auth/auth.module';
import { XpModule } from '../xp/xp.module';

@Module({
  imports: [AuthModule, XpModule],
  providers: [RoomsService, RoomsGateway, AgoraService],
  controllers: [RoomsController],
  exports: [RoomsService, RoomsGateway],
})
export class RoomsModule {}
