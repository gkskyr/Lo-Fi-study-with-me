import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private readonly config;
    private readonly logger;
    private transporter;
    constructor(config: ConfigService);
    sendVerificationCode(to: string, name: string, code: string): Promise<void>;
}
