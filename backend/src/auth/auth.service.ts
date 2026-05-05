import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { EmailValidatorService } from './services/email-validator.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly emailValidator: EmailValidatorService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Bu e-posta zaten kayıtlı.');

    // DB'de yoksa API token harca
    await this.emailValidator.validate(dto.email);

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      name: dto.name,
      password: hashed,
    });

    const code = this.generateOtp();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 dakika
    await this.usersService.setVerificationCode(user.email, code, expiry);
    await this.mailService.sendVerificationCode(user.email, user.name, code);

    return { message: 'Kayıt başarılı. E-posta adresinize doğrulama kodu gönderildi.' };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new BadRequestException('Geçersiz istek.');

    if (user.isEmailVerified) {
      return { message: 'E-posta zaten doğrulanmış.' };
    }

    if (
      !user.emailVerificationCode ||
      !user.emailVerificationExpiry ||
      user.emailVerificationCode !== dto.code ||
      user.emailVerificationExpiry < new Date()
    ) {
      throw new BadRequestException('Doğrulama kodu geçersiz veya süresi dolmuş.');
    }

    await this.usersService.verifyEmail(user.email);
    return this.signToken(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Geçersiz kimlik bilgileri.');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Geçersiz kimlik bilgileri.');

    if (!user.isEmailVerified) {
      throw new ForbiddenException('Lütfen önce e-posta adresinizi doğrulayın.');
    }

    return this.signToken(user.id, user.email);
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private signToken(userId: string, email: string) {
    const payload = { sub: userId, email };
    return { access_token: this.jwtService.sign(payload) };
  }
}
