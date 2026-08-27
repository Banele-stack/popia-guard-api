import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assessment, Finding } from './entities/assessment.entity';
import { CreateAssessmentDto } from './dto/create-assessment.dto';

@Injectable()
export class AssessmentsService {
  constructor(
    @InjectRepository(Assessment)
    private readonly assessmentsRepo: Repository<Assessment>,
  ) {}

  findAll(organizationId: string): Promise<Assessment[]> {
    return this.assessmentsRepo.find({ where: { organizationId }, order: { date: 'DESC' } });
  }

  async findOne(id: string, organizationId: string): Promise<Assessment> {
    const assessment = await this.assessmentsRepo.findOne({ where: { id, organizationId } });
    if (!assessment) {
      throw new NotFoundException(`Assessment ${id} not found`);
    }
    return assessment;
  }

  /** Numbered per-tenant so each organization's assessment ids start from their own POPIA-<year>-001. */
  private async nextId(organizationId: string): Promise<string> {
    const year = new Date().getUTCFullYear();
    const count = await this.assessmentsRepo.count({ where: { organizationId } });
    return `POPIA-${year}-${String(count + 1).padStart(3, '0')}`;
  }

  /**
   * Creates an assessment from the self-audit checklist form. Any checklist
   * item marked "Fail" automatically raises an open Finding and flips the
   * overall result to "Findings Raised".
   */
  async create(dto: CreateAssessmentDto, organizationId: string): Promise<Assessment> {
    const id = await this.nextId(organizationId);
    const failedItems = dto.checklist.filter((item) => item.status === 'Fail');

    const findings: Finding[] = failedItems.map((item, i) => ({
      id: `FND-${id.slice(6)}-${i + 1}`,
      checklistItemLabel: item.label,
      description: item.note?.trim() || `${item.label} failed the assessment.`,
      status: 'Open',
      raisedBy: dto.assessorName,
      raisedDate: dto.date,
    }));

    const assessment = this.assessmentsRepo.create({
      id,
      organizationId,
      title: dto.title,
      assessorName: dto.assessorName,
      date: dto.date,
      area: dto.area,
      result: failedItems.length > 0 ? 'Findings Raised' : 'Pass',
      notes: dto.notes ?? '',
      checklist: dto.checklist,
      findings,
    });

    return this.assessmentsRepo.save(assessment);
  }
}
