import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { MailService } from './mail.service';

export const MAIL_QUEUE = 'mail';

export interface VerificationMailJob {
  to: string;
  name: string;
  code: string;
}

@Processor(MAIL_QUEUE)
export class MailProcessor {
  constructor(private readonly mailService: MailService) {}

  @Process('send-verification')
  async handleVerification(job: Job<VerificationMailJob>) {
    const { to, name, code } = job.data;
    await this.mailService.sendVerificationCode(to, name, code);
  }
}
