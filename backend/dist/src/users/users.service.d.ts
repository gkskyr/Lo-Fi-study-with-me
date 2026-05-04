import { PrismaService } from '../prisma/prisma.service';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findByEmail(email: string): Promise<{
        id: string;
        email: string;
        password: string;
        name: string;
        role: import("@prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        emailVerificationCode: string | null;
        emailVerificationExpiry: Date | null;
        createdAt: Date;
    } | null>;
    findById(id: string): Promise<{
        id: string;
        email: string;
        password: string;
        name: string;
        role: import("@prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        emailVerificationCode: string | null;
        emailVerificationExpiry: Date | null;
        createdAt: Date;
    } | null>;
    create(data: {
        email: string;
        password: string;
        name: string;
    }): Promise<{
        id: string;
        email: string;
        password: string;
        name: string;
        role: import("@prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        emailVerificationCode: string | null;
        emailVerificationExpiry: Date | null;
        createdAt: Date;
    }>;
    setVerificationCode(email: string, code: string, expiry: Date): Promise<{
        id: string;
        email: string;
        password: string;
        name: string;
        role: import("@prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        emailVerificationCode: string | null;
        emailVerificationExpiry: Date | null;
        createdAt: Date;
    }>;
    verifyEmail(email: string): Promise<{
        id: string;
        email: string;
        password: string;
        name: string;
        role: import("@prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        emailVerificationCode: string | null;
        emailVerificationExpiry: Date | null;
        createdAt: Date;
    }>;
}
