import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// GET /rooms gibi endpoint'lerde token varsa kullanıcıyı tanır, yoksa null bırakır
@Injectable()
export class JwtOptionalAuthGuard extends AuthGuard('jwt') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest(_err: any, user: any): any {
    return user ?? null;
  }
}
