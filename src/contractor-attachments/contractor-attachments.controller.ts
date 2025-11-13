import {
  Controller,
  UseGuards,
  Post,
  Get,
  Delete,
  Param,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { ContractorAttachmentsService } from './contractor-attachments.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { ApiBearerAuth, ApiTags, ApiConsumes, ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { AttachmentLinkDto } from './dto/attachment-link.dto';

@ApiTags('Contractor Attachments') // ← появится группа в Swagger
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtGuard)
@Controller('attachments')
export class ContractorAttachmentsController {
  constructor(private readonly service: ContractorAttachmentsService) {}

  // Загрузка файла (multipart/form-data, поле "file")
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateAttachmentDto })
  async upload(@Req() req: FastifyRequest) {
    const user: any = (req as any).user;

    const mpFile = await (req as any).file(); // из @fastify/multipart
    if (!mpFile) throw new BadRequestException('Файл не загружен (multipart/form-data, поле "file")');

    const contractorId = await this.service.resolveContractorId(user);

    return this.service.saveStreamFile({
      contractorId,
      filename: mpFile.filename,
      mimetype: mpFile.mimetype,
      fileStream: mpFile.file,
    });
  }

  // Список ссылок (готовые URL для фронта)
  @Get()
  @ApiOkResponse({ type: [AttachmentLinkDto] })
  async list(@Req() req: FastifyRequest) {
    const contractorId = await this.service.resolveContractorId((req as any).user);
    return this.service.listForContractorAsLinks(contractorId, req);
  }

  // Скачивание файла по id (отдаёт файл, а не JSON)
  @Get(':id')
  async download(
    @Param('id') id: string,
    @Req() req: FastifyRequest & { reply: FastifyReply },
  ) {
    const contractorId = await this.service.resolveContractorId(
      (req as any).user,
    );

    const { downloadUrl } = await this.service.getStaticPathForContractor(
      id,
      contractorId,
    );

    // @ts-ignore
    return req.reply.redirect(downloadUrl);
  }

// Удаление по id
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: FastifyRequest) {
    const contractorId = await this.service.resolveContractorId(
      (req as any).user,
    );
    return this.service.deleteFileForContractor(id, contractorId);
  }
}
