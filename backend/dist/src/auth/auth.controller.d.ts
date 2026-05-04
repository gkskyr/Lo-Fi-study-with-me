import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import type { User } from '@prisma/client';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        message: string;
    }>;
    login(dto: LoginDto): Promise<{
        access_token: string;
    }>;
    verifyEmail(dto: VerifyEmailDto): Promise<{
        access_token: string;
    } | {
        message: string;
    }>;
    me(user: User): {
        id: string;
        email: string;
        name: string;
        role: import("@prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        emailVerificationCode: string | null;
        emailVerificationExpiry: Date | null;
        createdAt: Date;
    };
}
