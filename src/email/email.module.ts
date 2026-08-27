import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

// @Global so AuthModule (forgot-password), OrganizationsModule (invites)
// and AlertsModule (compliance digests) can all use it without each
// declaring their own import wiring.
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
