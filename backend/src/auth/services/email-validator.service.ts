import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as dns from 'dns/promises';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const disposableDomains: string[] = require('disposable-email-domains');

interface EmailReputationResponse {
  email_deliverability: {
    status: string;
    is_format_valid: boolean;
    is_smtp_valid: boolean;
    is_mx_valid: boolean;
  };
  email_quality: {
    is_disposable: boolean;
    score: number;
  };
  email_risk: {
    address_risk_status: 'low' | 'medium' | 'high';
  };
  error?: { code: string; message: string };
}

@Injectable()
export class EmailValidatorService {
  private readonly logger = new Logger(EmailValidatorService.name);

  constructor(private readonly config: ConfigService) {}

  async validate(email: string): Promise<void> {
    const apiKey = this.config.get<string>('ABSTRACT_API_KEY');

    if (apiKey) {
      await this.validateWithReputationApi(email, apiKey);
    } else {
      await this.validateWithFallback(email);
    }
  }

  private async validateWithReputationApi(email: string, apiKey: string): Promise<void> {
    const url = `https://emailreputation.abstractapi.com/v1/?api_key=${apiKey}&email=${encodeURIComponent(email)}`;

    let data: EmailReputationResponse;
    try {
      const res = await fetch(url);
      data = await res.json();
    } catch {
      this.logger.warn('Email Reputation API erişilemedi, fallback doğrulamaya geçiliyor.');
      await this.validateWithFallback(email);
      return;
    }

    if (data.error) {
      this.logger.warn(`Email Reputation API hatası (${data.error.code}): ${data.error.message} — fallback'e geçiliyor.`);
      await this.validateWithFallback(email);
      return;
    }

    if (!data.email_deliverability.is_format_valid) {
      throw new BadRequestException('Geçersiz e-posta formatı.');
    }
    if (data.email_quality.is_disposable) {
      throw new BadRequestException('Geçici (tek kullanımlık) e-posta adresleri kabul edilmez.');
    }
    if (!data.email_deliverability.is_mx_valid) {
      throw new BadRequestException('Bu e-posta adresi için geçerli bir mail sunucusu bulunamadı.');
    }
    if (data.email_deliverability.status === 'undeliverable') {
      throw new BadRequestException('Bu e-posta adresine ulaşılamıyor. Lütfen geçerli bir adres girin.');
    }
    if (data.email_risk.address_risk_status === 'high') {
      throw new BadRequestException('Bu e-posta adresi yüksek riskli olarak işaretlenmiş.');
    }
  }

  private async validateWithFallback(email: string): Promise<void> {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) {
      throw new BadRequestException('Geçersiz e-posta formatı.');
    }

    if (disposableDomains.includes(domain)) {
      throw new BadRequestException('Geçici (tek kullanımlık) e-posta adresleri kabul edilmez.');
    }

    try {
      const records = await dns.resolveMx(domain);
      if (!records || records.length === 0) {
        throw new BadRequestException('Bu domain için mail sunucusu bulunamadı.');
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Bu e-posta adresi için geçerli bir mail sunucusu bulunamadı.');
    }
  }
}
