import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Breach } from './entities/breach.entity';
import { CreateBreachDto } from './dto/create-breach.dto';
import { UpdateBreachDto } from './dto/update-breach.dto';

@Injectable()
export class BreachesService {
  constructor(
    @InjectRepository(Breach)
    private readonly breachesRepo: Repository<Breach>,
  ) {}

  findAll(organizationId: string): Promise<Breach[]> {
    return this.breachesRepo.find({ where: { organizationId }, order: { dateDiscovered: 'DESC' } });
  }

  async findOne(id: string, organizationId: string): Promise<Breach> {
    const breach = await this.breachesRepo.findOne({ where: { id, organizationId } });
    if (!breach) {
      throw new NotFoundException(`Breach ${id} not found`);
    }
    return breach;
  }

  /** Numbered per-tenant so each organization's breach ids start from their own BR-<year>-001. */
  private async nextId(organizationId: string): Promise<string> {
    const year = new Date().getUTCFullYear();
    const count = await this.breachesRepo.count({ where: { organizationId } });
    return `BR-${year}-${String(count + 1).padStart(3, '0')}`;
  }

  async create(dto: CreateBreachDto, organizationId: string): Promise<Breach> {
    const id = await this.nextId(organizationId);
    const breach = this.breachesRepo.create({
      id,
      organizationId,
      title: dto.title,
      severity: dto.severity,
      status: 'Open',
      dateDiscovered: dto.dateDiscovered,
      dateOccurred: dto.dateOccurred ?? null,
      description: dto.description,
      categoryOfDataAffected: dto.categoryOfDataAffected,
      numberOfDataSubjectsAffected: dto.numberOfDataSubjectsAffected,
      rootCause: null,
      correctiveActions: [],
      regulatorNotified: dto.regulatorNotified ?? false,
      dataSubjectsNotified: dto.dataSubjectsNotified ?? false,
    });
    return this.breachesRepo.save(breach);
  }

  async update(id: string, dto: UpdateBreachDto, organizationId: string): Promise<Breach> {
    const breach = await this.findOne(id, organizationId);
    Object.assign(breach, dto);
    return this.breachesRepo.save(breach);
  }
}
