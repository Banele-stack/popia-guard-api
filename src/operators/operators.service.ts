import {
  BadRequestException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { Operator } from './entities/operator.entity';
import { OperatorAgreement } from './entities/operator-agreement.entity';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';
import { CreateOperatorAgreementDto } from './dto/create-operator-agreement.dto';
import { FileStorage } from '../storage/file-storage';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

@Injectable()
export class OperatorsService {
  constructor(
    @InjectRepository(Operator)
    private readonly operatorsRepo: Repository<Operator>,
    @InjectRepository(OperatorAgreement)
    private readonly agreementsRepo: Repository<OperatorAgreement>,
    private readonly storage: FileStorage,
  ) {}

  findAll(organizationId: string): Promise<Operator[]> {
    return this.operatorsRepo.find({ where: { organizationId }, order: { name: 'ASC' } });
  }

  async findOne(id: string, organizationId: string): Promise<Operator> {
    const operator = await this.operatorsRepo.findOne({ where: { id, organizationId } });
    if (!operator) {
      throw new NotFoundException(`Operator ${id} not found`);
    }
    return operator;
  }

  create(dto: CreateOperatorDto, organizationId: string): Promise<Operator> {
    const operator = this.operatorsRepo.create({ ...dto, organizationId, agreements: [] });
    return this.operatorsRepo.save(operator);
  }

  async update(id: string, dto: UpdateOperatorDto, organizationId: string): Promise<Operator> {
    const operator = await this.findOne(id, organizationId);
    Object.assign(operator, dto);
    return this.operatorsRepo.save(operator);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const result = await this.operatorsRepo.delete({ id, organizationId });
    if (result.affected === 0) {
      throw new NotFoundException(`Operator ${id} not found`);
    }
  }

  static assertUploadIsAcceptable(file: { size: number; mimetype: string } | undefined): void {
    if (!file) {
      throw new BadRequestException('No file was uploaded.');
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new PayloadTooLargeException('File exceeds the 10MB upload limit.');
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new UnsupportedMediaTypeException('Only PDF, JPEG and PNG files are accepted.');
    }
  }

  async addAgreement(
    operatorId: string,
    dto: CreateOperatorAgreementDto,
    file: Express.Multer.File,
    organizationId: string,
  ): Promise<OperatorAgreement> {
    await this.findOne(operatorId, organizationId);

    const stored = await this.storage.save(file.buffer, file.originalname, `operator-agreements/${operatorId}`);

    const agreement = this.agreementsRepo.create({
      id: randomUUID(),
      operatorId,
      type: dto.type,
      signedDate: dto.signedDate,
      reviewDate: dto.reviewDate,
      referenceNumber: dto.referenceNumber,
      fileUrl: stored.relativePath,
      fileOriginalName: file.originalname,
      fileMimeType: file.mimetype,
      fileSizeBytes: file.size,
    });

    return this.agreementsRepo.save(agreement);
  }

  async removeAgreement(operatorId: string, agreementId: string, organizationId: string): Promise<void> {
    await this.findOne(operatorId, organizationId);
    const agreement = await this.agreementsRepo.findOne({ where: { id: agreementId, operatorId } });
    if (!agreement) {
      throw new NotFoundException(`Agreement ${agreementId} not found`);
    }
    if (agreement.fileUrl) {
      await this.storage.delete(agreement.fileUrl);
    }
    await this.agreementsRepo.delete({ id: agreementId });
  }

  async getAgreementWithFile(
    operatorId: string,
    agreementId: string,
    organizationId: string,
  ): Promise<OperatorAgreement> {
    await this.findOne(operatorId, organizationId);
    const agreement = await this.agreementsRepo.findOne({ where: { id: agreementId, operatorId } });
    if (!agreement || !agreement.fileUrl) {
      throw new NotFoundException('No file is attached to this agreement.');
    }
    return agreement;
  }
}
