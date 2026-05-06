import { ConfigService } from '@nestjs/config';
export declare class AgoraService {
    private readonly config;
    private readonly appId;
    private readonly appCertificate;
    constructor(config: ConfigService);
    generateRtcToken(roomId: string, userId: string): {
        token: string;
        uid: number;
        channelName: string;
    };
    private uuidToUid;
}
