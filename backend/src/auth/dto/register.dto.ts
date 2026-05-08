import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz.' })
  email: string;

  @IsString()
  @MinLength(3, { message: 'Kullanıcı adı en az 3 karakter olmalıdır.' })
  @MaxLength(20, { message: 'Kullanıcı adı en fazla 20 karakter olabilir.' })
  @Matches(/^[a-z0-9_]+$/, { message: 'Kullanıcı adı sadece küçük harf, rakam ve alt çizgi içerebilir.' })
  username: string;

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
