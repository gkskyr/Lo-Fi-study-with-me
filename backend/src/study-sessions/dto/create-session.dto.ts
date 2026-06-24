import { IsString, IsEnum, IsInt, Min, IsNotEmpty } from 'class-validator';
import { StudyMethod, MonitoringType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ example: 'Matematik — Türev' })
  @IsString()
  @IsNotEmpty()
  topic: string;

  @ApiProperty({ enum: StudyMethod })
  @IsEnum(StudyMethod)
  method: StudyMethod;

  @ApiProperty({ example: 25 })
  @IsInt()
  @Min(1)
  workMinutes: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  breakMinutes: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  totalRounds: number;

  @ApiProperty({ enum: MonitoringType })
  @IsEnum(MonitoringType)
  monitoringType: MonitoringType;
}
