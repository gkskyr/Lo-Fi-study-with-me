import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: 'Refresh token (login/verify-email yanıtında döner)' })
  @IsString()
  refresh_token: string;
}
