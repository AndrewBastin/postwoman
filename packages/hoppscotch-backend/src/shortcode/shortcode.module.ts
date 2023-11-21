import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from 'src/config/config.module';
import { ConfigService } from 'src/config/config.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PubSubModule } from 'src/pubsub/pubsub.module';
import { UserModule } from 'src/user/user.module';
import { ShortcodeResolver } from './shortcode.resolver';
import { ShortcodeService } from './shortcode.service';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    PubSubModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
      }),
    }),
  ],
  providers: [ShortcodeService, ShortcodeResolver],
  exports: [ShortcodeService],
})
export class ShortcodeModule {}
