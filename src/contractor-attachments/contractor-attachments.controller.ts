import {
  Controller,
  Post,
  Req,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtGuard } from '../common/guards/jwt.guard';
import { ContractorAttachmentsService } from './contractor-attachments.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';

import { UploadContractorAttachmentDto } from './dto/upload-contractor-attachment.dto';
import { ContractorAttachmentResponseDto } from './dto/contractor-attachment-response.dto';

@ApiTags('Contractor Attachments')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtGuard)
@Controller('contractor-attachments')
export class ContractorAttachmentsController {
  constructor(private readonly attachmentsService: ContractorAttachmentsService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadContractorAttachmentDto })
  @ApiOperation({ summary: 'Загрузить файл в профиль исполнителя' })
  @ApiResponse({ status: 201, type: ContractorAttachmentResponseDto })
  async upload(@Req() req: FastifyRequest) {
    const user = (req as any).user;
    const file = await (req as any).file().catch((err) => {
      console.error('❌ Ошибка при чтении файла:', err);
      return null;
    });

    console.log('👤 USER:', user);
    console.log('📦 FILE:', file ? { filename: file.filename, mimetype: file.mimetype } : 'нет файла');

    if (!user?.userId) throw new BadRequestException('Unauthorized');
    if (!file) throw new BadRequestException('Файл не был передан');

    const contractor = await this.attachmentsService['prisma'].contractor.findUnique({
      where: { userId: user.userId },
    });
    if (!contractor) throw new NotFoundException('Contractor not found');

    return this.attachmentsService.uploadAttachment(contractor.id, file);
  }

}
