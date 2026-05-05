import { IsEnum, IsString, MinLength } from 'class-validator';
import { RoomType } from '@prisma/client';

export class CreateRoomDto {
  @IsString()
  @MinLength(3, { message: 'Oda başlığı en az 3 karakter olmalıdır.' })
  title: string;

  @IsEnum(RoomType, { message: 'Oda tipi PERSONAL veya COMMUNITY olmalıdır.' })
  type: RoomType;
}
