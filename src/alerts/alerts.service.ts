import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { Organization } from '../organizations/entities/organization.entity';
import { User } from '../auth/entities/user.entity';
import { OperatorsService } from '../operators/operators.service';
import { ProcessingActivitiesService } from '../processing-activities/processing-activities.service';
import { EmailService } from '../email/email.service';
import { getReviewStatus, daysUntil } from '../common/status.util';

interface ReviewLine {
  label: string;
  reviewDate: string;
  daysRemaining: number;
}

/**
 * The proactive half of "catch it before it lapses" — without this, an
 * overdue operator agreement or ROPA review only surfaces if someone
 * happens to open the dashboard. Runs once a day per organization and
 * emails every admin a plain digest of what's overdue or due soon.
 */
@Injectable()
export class AlertsService {
  private readonly logger = new Logger('AlertsService');

  constructor(
    @InjectRepository(Organization) private readonly orgsRepo: Repository<Organization>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly operatorsService: OperatorsService,
    private readonly activitiesService: ProcessingActivitiesService,
    private readonly emailService: EmailService,
  ) {}

  // Once a day at 06:00 server time.
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async sendDailyComplianceDigests(): Promise<void> {
    const organizations = await this.orgsRepo.find();
    for (const org of organizations) {
      try {
        await this.sendDigestForOrganization(org.id, org.name);
      } catch (err) {
        this.logger.error(
          `Failed to build/send compliance digest for org ${org.id}`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    }
  }

  async sendDigestForOrganization(organizationId: string, organizationName: string): Promise<void> {
    const [operators, activities, admins] = await Promise.all([
      this.operatorsService.findAll(organizationId),
      this.activitiesService.findAll(organizationId),
      this.usersRepo.find({ where: { organizationId, role: 'admin' } }),
    ]);

    const agreementLines: ReviewLine[] = [];
    for (const operator of operators) {
      for (const agreement of operator.agreements) {
        const status = getReviewStatus(agreement.reviewDate);
        if (status === 'Compliant') continue;
        agreementLines.push({
          label: `${operator.name} — ${agreement.type}`,
          reviewDate: agreement.reviewDate,
          daysRemaining: daysUntil(agreement.reviewDate),
        });
      }
    }

    const activityLines: ReviewLine[] = [];
    for (const activity of activities) {
      const status = getReviewStatus(activity.reviewDate);
      if (status === 'Compliant') continue;
      activityLines.push({
        label: activity.activityName,
        reviewDate: activity.reviewDate,
        daysRemaining: daysUntil(activity.reviewDate),
      });
    }

    if (agreementLines.length === 0 && activityLines.length === 0) {
      this.logger.log(`Nothing due for org ${organizationId} — skipping digest.`);
      return;
    }
    if (admins.length === 0) {
      this.logger.warn(`Org ${organizationId} has items due but no admin user to email.`);
      return;
    }

    const html = this.renderDigestHtml(organizationName, agreementLines, activityLines);
    const subject = `POPIAGuard: ${agreementLines.length + activityLines.length} item(s) need attention`;

    for (const admin of admins) {
      await this.emailService.send({ to: admin.email, subject, html });
    }
  }

  private renderDigestHtml(orgName: string, agreements: ReviewLine[], activities: ReviewLine[]): string {
    const row = (line: ReviewLine) => {
      const status =
        line.daysRemaining < 0
          ? `<strong style="color:#dc2626">overdue by ${Math.abs(line.daysRemaining)} day(s)</strong>`
          : `<strong style="color:#d97706">due in ${line.daysRemaining} day(s)</strong>`;
      return `<li>${line.label} — ${status} (${line.reviewDate})</li>`;
    };

    return `
      <div style="font-family:Arial,sans-serif;color:#1e293b;max-width:560px">
        <h2 style="margin-bottom:4px">POPIAGuard — Daily Compliance Digest</h2>
        <p style="color:#64748b;margin-top:0">${orgName}</p>
        ${
          agreements.length > 0
            ? `<h3>Operator agreements</h3><ul>${agreements.map(row).join('')}</ul>`
            : ''
        }
        ${
          activities.length > 0
            ? `<h3>Processing activity reviews</h3><ul>${activities.map(row).join('')}</ul>`
            : ''
        }
        <p style="color:#64748b;font-size:12px;margin-top:24px">
          You're receiving this because you're an admin on a POPIAGuard account.
        </p>
      </div>
    `;
  }
}
