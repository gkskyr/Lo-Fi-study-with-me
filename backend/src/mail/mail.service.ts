import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: config.get<number>('SMTP_PORT') ?? 587,
        secure: false,
        auth: {
          user: config.get<string>('SMTP_USER'),
          pass: config.get<string>('SMTP_PASS'),
        },
      });
    }
  }

  async sendVerificationCode(to: string, name: string, code: string) {
    if (!this.transporter) {
      // SMTP yapılandırılmamışsa kodu konsola yaz (geliştirme modu)
      this.logger.warn(`[DEV] ${to} için doğrulama kodu: ${code}`);
      return;
    }

    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM') ?? 'noreply@kozan.app',
      to,
      subject: 'koZan — E-posta Doğrulama Kodunuz',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2>Merhaba ${name},</h2>
          <p>koZan hesabınızı doğrulamak için aşağıdaki kodu kullanın:</p>
          <div style="font-size:32px;font-weight:bold;letter-spacing:8px;
                      background:#f4f4f4;padding:16px;text-align:center;border-radius:8px">
            ${code}
          </div>
          <p style="color:#888;font-size:12px;margin-top:16px">
            Bu kod 10 dakika geçerlidir. Eğer bu işlemi siz yapmadıysanız bu e-postayı görmezden gelin.
          </p>
        </div>
      `,
    });
  }
}
