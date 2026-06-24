import { IsString, MaxLength, MinLength, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUnitDto {
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;
}

export class CreateTopicDto {
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;
}

export class CreateNoteDto {
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;
}

export class AutosaveNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  // Tiptap JSON — tip güvenliği servis katmanında değil, frontend sorumluluğunda
  content?: unknown;
}
