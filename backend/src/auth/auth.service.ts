import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { MAIL_QUEUE, type VerificationMailJob } from '../mail/mail.processor';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { EmailValidatorService } from './services/email-validator.service';

@Injectable()
export class AuthService {
  private readonly refreshExpiresDays: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailValidator: EmailValidatorService,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
    config: ConfigService,
  ) {
    this.refreshExpiresDays = config.get<number>('JWT_REFRESH_EXPIRES_DAYS', 7);
  }

  async register(dto: RegisterDto) {
    const existingEmail = await this.usersService.findByEmail(dto.email);
    if (existingEmail) throw new ConflictException('Bu e-posta zaten kayıtlı.');

    const existingUsername = await this.usersService.findByUsername(
      dto.username,
    );
    if (existingUsername) throw new ConflictException('Bu kullanıcı adı zaten alınmış.');

    await this.emailValidator.validate(dto.email);

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      username: dto.username,
      name: dto.name,
      password: hashed,
    });

    await this.usersService.createPersonalRoom(user.id, user.name);

    const code = this.generateOtp();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);
    await this.usersService.setVerificationCode(user.email, code, expiry);

    await this.mailQueue.add('send-verification', {
      to: user.email,
      name: user.name,
      code,
    } satisfies VerificationMailJob);

    return {
      message: 'Kayıt başarılı. E-posta adresinize doğrulama kodu gönderildi.',
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new BadRequestException('Geçersiz istek.');

    if (user.isEmailVerified) return { message: 'E-posta zaten doğrulanmış.' };

    if (
      !user.emailVerificationCode ||
      !user.emailVerificationExpiry ||
      user.emailVerificationCode !== dto.code ||
      user.emailVerificationExpiry < new Date()
    ) {
      throw new BadRequestException(
        'Doğrulama kodu geçersiz veya süresi dolmuş.',
      );
    }

    await this.usersService.verifyEmail(user.email);
    return this.issueTokenPair(user.id, user.email, user.username);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Geçersiz kimlik bilgileri.');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Geçersiz kimlik bilgileri.');

    if (!user.isEmailVerified) {
      throw new ForbiddenException(
        'Lütfen önce e-posta adresinizi doğrulayın.',
      );
    }

    await this.usersService.deleteExpiredRefreshTokens(user.id);

    return this.issueTokenPair(user.id, user.email, user.username);
  }

  async refresh(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.usersService.findRefreshToken(tokenHash);

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await this.usersService.deleteRefreshToken(tokenHash);
      throw new UnauthorizedException(
        'Refresh token geçersiz veya süresi dolmuş.',
      );
    }

    await this.usersService.deleteRefreshToken(tokenHash);
    return this.issueTokenPair(
      stored.user.id,
      stored.user.email,
      stored.user.username,
    );
  }

  async logout(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.usersService.deleteRefreshToken(tokenHash);
    return { message: 'Çıkış yapıldı.' };
  }

  async logoutAll(userId: string) {
    await this.usersService.deleteAllRefreshTokens(userId);
    return { message: 'Tüm oturumlar kapatıldı.' };
  }

  // ── Yardımcılar ─────────────────────────────────────────────────────────────

  private async issueTokenPair(
    userId: string,
    email: string,
    username: string,
  ) {
    const access_token = this.jwtService.sign({ sub: userId, email, username });

    const rawRefresh = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(rawRefresh);
    const expiresAt = new Date(
      Date.now() + this.refreshExpiresDays * 24 * 60 * 60 * 1000,
    );
    await this.usersService.saveRefreshToken(userId, tokenHash, expiresAt);

    return { access_token, refresh_token: rawRefresh, username };
  }

  private hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
