import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { MailProcessor, MAIL_QUEUE } from './mail.processor';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: MAIL_QUEUE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get<string>('REDIS_URL', 'redis://localhost:6379'),
        defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      }),
    }),
  ],
  providers: [MailService, MailProcessor],
  exports: [MailService, BullModule],
})
export class MailModule {}
