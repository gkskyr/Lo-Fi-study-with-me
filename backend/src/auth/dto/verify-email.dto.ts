import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz.' })
  email: string;

  @IsString()
  @Length(6, 6, { message: 'Doğrulama kodu 6 haneli olmalıdır.' })
  code: string;
}
