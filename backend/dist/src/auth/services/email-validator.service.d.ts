import { ConfigService } from '@nestjs/config';
export declare class EmailValidatorService {
    private readonly config;
    private readonly logger;
    constructor(config: ConfigService);
    validate(email: string): Promise<void>;
    private validateWithReputationApi;
    private validateWithFallback;
}
