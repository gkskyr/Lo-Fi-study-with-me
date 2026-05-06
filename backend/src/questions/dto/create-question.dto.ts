import { IsString, IsUUID, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateQuestionDto {
  @IsUUID('4', { message: 'Geçerli bir oda ID giriniz.' })
  roomId: string;

  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MinLength(10, { message: 'Soru en az 10 karakter olmalıdır.' })
  @MaxLength(500, { message: 'Soru en fazla 500 karakter olabilir.' })
  content: string;
}
