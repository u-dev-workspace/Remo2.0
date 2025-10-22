import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post, Query,
  Req, UseGuards, ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody, ApiQuery,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddAttachmentDto } from './dto/add-attachment.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { ProjectsListQueryDto } from './dto/projects-list.dto';

@ApiTags('Project') // ← появится группа в Swagger
@ApiBearerAuth('bearerAuth')
@Controller('projects')
@UseGuards(JwtGuard)
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  // В реальном проекте бери clientId из auth (req.user.sub)
  @Post()
  @ApiOperation({ summary: 'Создать проект' })
  @ApiCreatedResponse({ description: 'Проект создан' })
  async create(@Body() dto: CreateProjectDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.service.create(userId, dto);
  }

  @Get(':projectId')
  @ApiOperation({ summary: 'Получить проект' })
  @ApiOkResponse()
  async getOne(@Param('projectId') projectId: string) {
    return this.service.findOne(projectId);
  }

  @Patch(':projectId')
  @ApiOperation({ summary: 'Обновить проект' })
  @ApiOkResponse()
  async update(
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.service.update(projectId, dto);
  }

  @Delete(':projectId')
  @ApiOperation({ summary: 'Удалить проект' })
  @ApiOkResponse()
  async remove(@Param('projectId') projectId: string) {
    return this.service.remove(projectId);
  }

  // -------- Upload (multipart) --------
  @Post(':projectId/attachments/upload')
  @ApiOperation({ summary: 'Загрузить картинку как вложение (сохраняет файл на диск)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        sortOrder: { type: 'integer', example: 0 },
      },
      required: ['file'],
    },
  })
  async uploadAttachment(@Param('projectId') projectId: string, @Req() req: any) {
    // userId лучше брать из auth: req.user.sub / req.user.id
    const userId = req?.user?.sub ?? req?.user?.id ?? 'anonymous';
    return this.service.uploadAttachment(projectId, userId, req);
  }

  @Get(':projectId/attachments')
  listAttachments(@Param('projectId') projectId: string) {
    return this.service.listAttachments(projectId);
  }

  @Patch(':projectId/cover/:attachmentId')
  setCover(@Param('projectId') projectId: string, @Param('attachmentId') attachmentId: string) {
    return this.service.setCover(projectId, attachmentId);
  }

  @Delete(':projectId/attachments/:attachmentId')
  deleteAttachment(@Param('projectId') projectId: string, @Param('attachmentId') attachmentId: string) {
    return this.service.deleteAttachment(projectId, attachmentId);
  }

  @Get()
  async list(
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: ProjectsListQueryDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id ?? null;
    return this.service.listProjects({ ...query, userId }); // ← один аргумент
  }
}
