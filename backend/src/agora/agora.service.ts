import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

@Injectable()
export class AgoraService {
  private readonly appId: string;
  private readonly appCertificate: string;

  constructor(private readonly config: ConfigService) {
    this.appId = config.getOrThrow<string>('AGORA_APP_ID');
    this.appCertificate = config.getOrThrow<string>('AGORA_APP_CERTIFICATE');
  }

  generateRtcToken(
    roomId: string,
    userId: string,
  ): { token: string; uid: number; channelName: string } {
    const channelName = roomId;
    const uid = this.uuidToUid(userId);
    const expireTime = Math.floor(Date.now() / 1000) + 3600;

    const token = RtcTokenBuilder.buildTokenWithUid(
      this.appId,
      this.appCertificate,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      expireTime,
    );

    return { token, uid, channelName };
  }

  // UUID'nin ilk 8 hex karakterini Agora'nın beklediği uint32 aralığına (0–4294967295) çevirir.
  private uuidToUid(uuid: string): number {
    return parseInt(uuid.replace(/-/g, '').slice(0, 8), 16) >>> 0;
  }
}
