import { Module } from '@nestjs/common';
import { MailerModule as NestMailerModule } from '@nestjs-modules/mailer';
import { MailerService } from './mailer.service';
import { throwErr } from 'src/utils';
import {
  MAILER_FROM_ADDRESS_UNDEFINED,
  MAILER_SMTP_URL_UNDEFINED,
} from 'src/errors';
import { ConfigModule } from 'src/config/config.module';
import { ConfigService } from 'src/config/config.service';

@Module({
  imports: [
    NestMailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: async (configService: ConfigService) => ({
        transport:
          configService.get('MAILER_SMTP_URL') ??
          throwErr(MAILER_SMTP_URL_UNDEFINED),
        defaults: {
          from:
            configService.get('MAILER_ADDRESS_FROM') ??
            throwErr(MAILER_FROM_ADDRESS_UNDEFINED),
        },
      }),
    }),
  ],
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}
