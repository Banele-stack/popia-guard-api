import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { OperatorsService } from './operators.service';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';
import { CreateOperatorAgreementDto } from './dto/create-operator-agreement.dto';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { FileStorage } from '../storage/file-storage';

@Controller('operators')
export class OperatorsController {
  constructor(
    private readonly operatorsService: OperatorsService,
    private readonly storage: FileStorage,
  ) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.operatorsService.findAll(user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.operatorsService.findOne(id, user.organizationId);
  }

  @Post()
  create(@Body() dto: CreateOperatorDto, @CurrentUser() user: AuthenticatedUser) {
    return this.operatorsService.create(dto, user.organizationId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOperatorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.operatorsService.update(id, dto, user.organizationId);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.operatorsService.remove(id, user.organizationId);
  }

  // ---- Operator agreements (the actual signed agreement file) ------------

  @Post(':id/agreements')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  addAgreement(
    @Param('id') id: string,
    @Body() dto: CreateOperatorAgreementDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    OperatorsService.assertUploadIsAcceptable(file);
    return this.operatorsService.addAgreement(id, dto, file, user.organizationId);
  }

  @Delete(':id/agreements/:agreementId')
  removeAgreement(
    @Param('id') id: string,
    @Param('agreementId') agreementId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.operatorsService.removeAgreement(id, agreementId, user.organizationId);
  }

  @Get(':id/agreements/:agreementId/file')
  async downloadAgreement(
    @Param('id') id: string,
    @Param('agreementId') agreementId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const agreement = await this.operatorsService.getAgreementWithFile(id, agreementId, user.organizationId);
    const stream = await this.storage.getStream(agreement.fileUrl as string);
    res.setHeader('Content-Type', agreement.fileMimeType ?? 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${(agreement.fileOriginalName ?? 'agreement').replace(/"/g, '')}"`,
    );
    stream.pipe(res);
  }
}
