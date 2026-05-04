import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as dns from 'dns/promises';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const disposableDomains: string[] = require('disposable-email-domains');

interface AbstractApiResponse {
  deliverability: 'DELIVERABLE' | 'UNDELIVERABLE' | 'RISKY' | 'UNKNOWN';
  is_valid_format: { value: boolean };
  is_disposable_email: { value: boolean };
  is_mx_found: { value: boolean };
  is_smtp_valid: { value: boolean };
}

@Injectable()
export class EmailValidatorService {
  private readonly logger = new Logger(EmailValidatorService.name);

  constructor(private readonly config: ConfigService) {}

  async validate(email: string): Promise<void> {
    const apiKey = this.config.get<string>('ABSTRACT_API_KEY');

    if (apiKey) {
      await this.validateWithAbstractApi(email, apiKey);
    } else {
      await this.validateWithFallback(email);
    }
  }

  private async validateWithAbstractApi(email: string, apiKey: string): Promise<void> {
    const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${apiKey}&email=${encodeURIComponent(email)}`;

    let data: AbstractApiResponse;
    try {
      const res = await fetch(url);
      data = (await res.json()) as AbstractApiResponse;
    } catch {
      // Abstract API erişilemiyorsa fallback'e geç
      this.logger.warn('Abstract API erişilemedi, fallback doğrulamaya geçiliyor.');
      await this.validateWithFallback(email);
      return;
    }

    if (!data.is_valid_format?.value) {
      throw new BadRequestException('Geçersiz e-posta formatı.');
    }
    if (data.is_disposable_email?.value) {
      throw new BadRequestException('Geçici (tek kullanımlık) e-posta adresleri kabul edilmez.');
    }
    if (!data.is_mx_found?.value) {
      throw new BadRequestException('Bu e-posta adresi için geçerli bir mail sunucusu bulunamadı.');
    }
    if (data.deliverability === 'UNDELIVERABLE') {
      throw new BadRequestException('Bu e-posta adresine ulaşılamıyor. Lütfen geçerli bir adres girin.');
    }
  }

  private async validateWithFallback(email: string): Promise<void> {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) {
      throw new BadRequestException('Geçersiz e-posta formatı.');
    }

    // Disposable e-posta kontrolü
    if (disposableDomains.includes(domain)) {
      throw new BadRequestException('Geçici (tek kullanımlık) e-posta adresleri kabul edilmez.');
    }

    // MX kaydı kontrolü
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
