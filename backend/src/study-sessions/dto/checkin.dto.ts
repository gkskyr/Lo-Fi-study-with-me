import { IsBoolean, IsEnum, IsInt, Min } from 'class-validator';
import { MonitoringType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CheckInDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  round: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  passed: boolean;

  @ApiProperty({ enum: MonitoringType })
  @IsEnum(MonitoringType)
  monitoringType: MonitoringType;
}
