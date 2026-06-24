import { IsString, IsUUID, IsOptional, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateQuestionDto {
  @IsUUID('4', { message: 'Geçerli bir oda ID giriniz.' })
  roomId: string;

  @IsOptional()
  @Transform(({ value }: { value: string }) => value?.trim() || undefined)
  @IsString()
  @MaxLength(500, { message: 'Soru en fazla 500 karakter olabilir.' })
  content?: string;
}
