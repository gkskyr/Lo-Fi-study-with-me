import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { EmailValidatorService } from './services/email-validator.service';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly mailService;
    private readonly emailValidator;
    constructor(usersService: UsersService, jwtService: JwtService, mailService: MailService, emailValidator: EmailValidatorService);
    register(dto: RegisterDto): Promise<{
        message: string;
    }>;
    verifyEmail(dto: VerifyEmailDto): Promise<{
        access_token: string;
    } | {
        message: string;
    }>;
    login(dto: LoginDto): Promise<{
        access_token: string;
    }>;
    private generateOtp;
    private signToken;
}
