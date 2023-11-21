import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  public get(val: string): string | undefined {
    console.log(`Configuration (${val}) was resolved through Config Service`);

    // TODO: This is just a placeholder
    return process.env[val];
  }
}
