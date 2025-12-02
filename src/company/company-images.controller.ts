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
import { JwtGuard } from '../common/guards/jwt.guard';
import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  ApiBearerAuth,
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiOkResponse,
} from '@nestjs/swagger';
import { CompanyImagesService } from './company-images.service';
import { CreateCompanyImageDto } from './dto/create-company-image.dto';

@ApiTags('Company Images')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtGuard)
@Controller('company-images')
export class CompanyImagesController {
  constructor(private readonly service: CompanyImagesService) {}

  // Загрузка файла (multipart/form-data, поле "file")
  @Post(':companyId')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateCompanyImageDto })
  async upload(
    @Param('companyId') companyId: string,
    @Req() req: FastifyRequest,
  ) {
    const user: any = (req as any).user;

    // проверяем, что юзер имеет доступ к компании
    await this.service.ensureUserHasAccessToCompany(user, companyId);

    const mpFile = await (req as any).file(); // из @fastify/multipart
    if (!mpFile)
      throw new BadRequestException(
        'Файл не загружен (multipart/form-data, поле "file")',
      );

    return this.service.saveStreamFile({
      companyId,
      filename: mpFile.filename,
      mimetype: mpFile.mimetype,
      fileStream: mpFile.file,
    });
  }

  // Список ссылок (готовые URL для фронта)
  @Get(':companyId')
  @ApiOkResponse({
    description: 'Список изображений компании',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          filename: { type: 'string' },
          url: { type: 'string' },
          isMain: { type: 'boolean' },
          sortOrder: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async list(@Param('companyId') companyId: string, @Req() req: FastifyRequest) {
    const user: any = (req as any).user;
    await this.service.ensureUserHasAccessToCompany(user, companyId);

    return this.service.listForCompanyAsLinks(companyId, req);
  }

  // Скачивание / просмотр по id (редирект на presigned url)
  @Get(':companyId/:id')
  async download(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Req() req: FastifyRequest & { reply: FastifyReply },
  ) {
    const user: any = (req as any).user;
    await this.service.ensureUserHasAccessToCompany(user, companyId);

    const { downloadUrl } = await this.service.getStaticPathForCompany(
      id,
      companyId,
    );

    return req.reply.redirect(downloadUrl);
  }

  @Delete(':companyId/:id')
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Req() req: FastifyRequest,
  ) {
    const user: any = (req as any).user;
    await this.service.ensureUserHasAccessToCompany(user, companyId);

    return this.service.deleteImageForCompany(id, companyId);
  }
}
