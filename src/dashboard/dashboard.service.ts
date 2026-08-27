import { Injectable } from '@nestjs/common';
import { OperatorsService } from '../operators/operators.service';
import { ProcessingActivitiesService } from '../processing-activities/processing-activities.service';
import { AssessmentsService } from '../assessments/assessments.service';
import { BreachesService } from '../breaches/breaches.service';
import { daysUntil, getReviewStatus, todayIso } from '../common/status.util';

export interface DashboardStats {
  totalOperators: number;
  operatorsOverdue: number;
  operatorsDueSoon: number;
  totalProcessingActivities: number;
  activitiesOverdue: number;
  activitiesDueSoon: number;
  openFindings: number;
  breachesOpen: number;
  breachesUnreported: number;
  breachesThisMonth: number;
}

export type BadgeTone = 'good' | 'warning' | 'critical' | 'info' | 'neutral';

export interface NeedsAttentionItem {
  id: string;
  domain: 'operator' | 'processing-activity' | 'assessment' | 'breach';
  title: string;
  subtitle: string;
  href: string;
  tone: BadgeTone;
  urgencyRank: number;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly operatorsService: OperatorsService,
    private readonly activitiesService: ProcessingActivitiesService,
    private readonly assessmentsService: AssessmentsService,
    private readonly breachesService: BreachesService,
  ) {}

  private getOperatorStatus(agreements: { reviewDate: string }[]) {
    if (agreements.length === 0) return 'Overdue' as const; // no agreement at all is itself the worst case
    const statuses = agreements.map((a) => getReviewStatus(a.reviewDate));
    if (statuses.includes('Overdue')) return 'Overdue' as const;
    if (statuses.includes('Review Due Soon')) return 'Review Due Soon' as const;
    return 'Compliant' as const;
  }

  async getStats(organizationId: string): Promise<DashboardStats> {
    const [operators, activities, assessments, breaches] = await Promise.all([
      this.operatorsService.findAll(organizationId),
      this.activitiesService.findAll(organizationId),
      this.assessmentsService.findAll(organizationId),
      this.breachesService.findAll(organizationId),
    ]);

    const operatorStatuses = operators.map((o) => this.getOperatorStatus(o.agreements));
    const activityStatuses = activities.map((a) => getReviewStatus(a.reviewDate));

    const openFindings = assessments
      .flatMap((a) => a.findings)
      .filter((f) => f.status === 'Open' || f.status === 'In Progress').length;

    const currentMonthPrefix = todayIso().slice(0, 7);

    return {
      totalOperators: operators.length,
      operatorsOverdue: operatorStatuses.filter((s) => s === 'Overdue').length,
      operatorsDueSoon: operatorStatuses.filter((s) => s === 'Review Due Soon').length,
      totalProcessingActivities: activities.length,
      activitiesOverdue: activityStatuses.filter((s) => s === 'Overdue').length,
      activitiesDueSoon: activityStatuses.filter((s) => s === 'Review Due Soon').length,
      openFindings,
      breachesOpen: breaches.filter((b) => b.status !== 'Closed').length,
      breachesUnreported: breaches.filter((b) => b.severity === 'Reportable' && !b.regulatorNotified).length,
      breachesThisMonth: breaches.filter((b) => b.dateDiscovered.startsWith(currentMonthPrefix)).length,
    };
  }

  async getNeedsAttentionFeed(organizationId: string): Promise<NeedsAttentionItem[]> {
    const [operators, activities, assessments, breaches] = await Promise.all([
      this.operatorsService.findAll(organizationId),
      this.activitiesService.findAll(organizationId),
      this.assessmentsService.findAll(organizationId),
      this.breachesService.findAll(organizationId),
    ]);

    const items: NeedsAttentionItem[] = [];

    for (const operator of operators) {
      if (operator.agreements.length === 0) {
        items.push({
          id: operator.id,
          domain: 'operator',
          title: `${operator.name} — no agreement on file`,
          subtitle: 'POPIA s21 requires a written agreement with every operator',
          href: `/operators/${operator.id}`,
          tone: 'critical',
          urgencyRank: -9999,
        });
        continue;
      }
      for (const agreement of operator.agreements) {
        const status = getReviewStatus(agreement.reviewDate);
        if (status === 'Compliant') continue;
        const remaining = daysUntil(agreement.reviewDate);
        items.push({
          id: agreement.id,
          domain: 'operator',
          title: `${operator.name} — ${agreement.type}`,
          subtitle:
            remaining < 0
              ? `Overdue by ${Math.abs(remaining)} day${Math.abs(remaining) === 1 ? '' : 's'}`
              : `Review due in ${remaining} day${remaining === 1 ? '' : 's'}`,
          href: `/operators/${operator.id}`,
          tone: status === 'Overdue' ? 'critical' : 'warning',
          urgencyRank: remaining,
        });
      }
    }

    for (const activity of activities) {
      const status = getReviewStatus(activity.reviewDate);
      if (status === 'Compliant') continue;
      const remaining = daysUntil(activity.reviewDate);
      items.push({
        id: activity.id,
        domain: 'processing-activity',
        title: activity.activityName,
        subtitle:
          remaining < 0
            ? `Review overdue by ${Math.abs(remaining)} day${Math.abs(remaining) === 1 ? '' : 's'}`
            : `Review due in ${remaining} day${remaining === 1 ? '' : 's'}`,
        href: `/processing-activities/${activity.id}`,
        tone: status === 'Overdue' ? 'critical' : 'warning',
        urgencyRank: remaining,
      });
    }

    for (const assessment of assessments) {
      for (const finding of assessment.findings) {
        if (finding.status === 'Resolved') continue;
        items.push({
          id: finding.id,
          domain: 'assessment',
          title: `${assessment.title} — ${finding.checklistItemLabel}`,
          subtitle: finding.status === 'Open' ? 'Finding open' : 'Finding in progress',
          href: `/assessments/${assessment.id}`,
          tone: finding.status === 'Open' ? 'critical' : 'warning',
          urgencyRank: finding.status === 'Open' ? -1000 : -500,
        });
      }
    }

    for (const breach of breaches) {
      if (breach.status === 'Closed') continue;
      const unreported = breach.severity === 'Reportable' && !breach.regulatorNotified;
      items.push({
        id: breach.id,
        domain: 'breach',
        title: breach.title,
        subtitle: unreported
          ? `${breach.severity} · not yet reported to the Regulator`
          : `${breach.severity} · ${breach.status}`,
        href: `/breaches/${breach.id}`,
        tone: unreported || breach.severity === 'Reportable' ? 'critical' : 'info',
        urgencyRank: unreported ? -3000 : breach.severity === 'Reportable' ? -2000 : -800,
      });
    }

    return items.sort((a, b) => a.urgencyRank - b.urgencyRank);
  }
}
