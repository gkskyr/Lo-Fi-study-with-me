import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Bu e-posta zaten kayıtlı.');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      name: dto.name,
      password: hashed,
    });

    return this.signToken(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Geçersiz kimlik bilgileri.');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Geçersiz kimlik bilgileri.');

    return this.signToken(user.id, user.email);
  }

  private signToken(userId: string, email: string) {
    const payload = { sub: userId, email };
    return { access_token: this.jwtService.sign(payload) };
  }
}
