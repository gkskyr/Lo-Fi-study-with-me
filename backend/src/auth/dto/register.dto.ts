import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz.' })
  email: string;

  @IsString()
  @MinLength(2, { message: 'İsim en az 2 karakter olmalıdır.' })
  name: string;

  @IsString()
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalıdır.' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>\-_])[A-Za-z\d!@#$%^&*(),.?":{}|<>\-_]{8,}$/, {
    message: 'Şifre en az 1 büyük harf, 1 rakam ve 1 özel karakter içermelidir.',
  })
  password: string;
}
