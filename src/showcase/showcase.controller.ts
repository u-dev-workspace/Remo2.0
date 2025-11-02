import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { ShowcaseService } from './showcase.service';
import {
  ReorderShowcaseDto,
  SetShowcaseDto,
  ShowcaseItemDto,
  ShowcaseItemOut,
  ShowcaseListOut,
} from './dto/showcase.dto';
import { JwtGuard } from '../common/guards/jwt.guard';

@ApiTags('Showcase')
@Controller('ShowCases')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@ApiExtraModels(ShowcaseItemDto, SetShowcaseDto, ReorderShowcaseDto, ShowcaseItemOut, ShowcaseListOut)
export class ShowcaseController {
  constructor(private readonly service: ShowcaseService) {}

  // ===== PROJECT =====

  @Get('projects/:projectId/showcase')
  @ApiOperation({ summary: 'Получить витрину проекта (до 3 элементов)' })
  @ApiParam({ name: 'projectId', description: 'ID проекта', example: 'prj_123' })
  @ApiOkResponse({
    description: 'Упорядоченный список элементов витрины',
    schema: {
      $ref: getSchemaPath(ShowcaseListOut),
    },
  })
  async getProject(@Param('projectId') projectId: string) {
    return this.service.getProjectShowcase(projectId);
  }

  @Post('projects/:projectId/showcase')
  @ApiOperation({ summary: 'Полностью заменить витрину проекта (1..3 позиций)' })
  @ApiParam({ name: 'projectId', description: 'ID проекта', example: 'prj_123' })
  @ApiBody({
    type: SetShowcaseDto,
    examples: {
      full: {
        summary: '3 позиции (рекомендуется)',
        value: {
          items: [
            { attachmentId: 'att_1', position: 1 },
            { attachmentId: 'att_2', position: 2 },
            { attachmentId: 'att_3', position: 3 },
          ],
        },
      },
      legacyOrderField: {
        summary: 'Старое поле `order` (тоже принимается)',
        value: {
          items: [
            { attachmentId: 'att_1', order: 1 },
            { attachmentId: 'att_2', order: 2 },
          ],
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Актуальная витрина после замены',
    schema: { $ref: getSchemaPath(ShowcaseListOut) },
  })
  async setProject(@Param('projectId') projectId: string, @Body() dto: SetShowcaseDto) {
    return this.service.setProjectShowcase(projectId, dto);
  }

  @Patch('projects/:projectId/showcase/reorder')
  @ApiOperation({ summary: 'Переупорядочить витрину проекта (drag&drop)' })
  @ApiParam({ name: 'projectId', description: 'ID проекта', example: 'prj_123' })
  @ApiBody({
    type: ReorderShowcaseDto,
    examples: {
      reorder: {
        summary: 'Новый порядок из 3 элементов',
        value: { attachmentIds: ['att_3', 'att_1', 'att_2'] },
      },
    },
  })
  @ApiOkResponse({
    description: 'Актуальная витрина после переупорядочивания',
    schema: { $ref: getSchemaPath(ShowcaseListOut) },
  })
  async reorderProject(@Param('projectId') projectId: string, @Body() dto: ReorderShowcaseDto) {
    return this.service.reorderProjectShowcase(projectId, dto);
  }

  @Delete('projects/:projectId/showcase/:attachmentId')
  @ApiOperation({ summary: 'Удалить картинку из витрины проекта' })
  @ApiParam({ name: 'projectId', example: 'prj_123' })
  @ApiParam({ name: 'attachmentId', example: 'att_1' })
  @ApiOkResponse({
    description: 'Актуальная витрина после удаления',
    schema: { $ref: getSchemaPath(ShowcaseListOut) },
  })
  async removeProject(
    @Param('projectId') projectId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.service.removeProjectShowcaseItem(projectId, attachmentId);
  }

  // ===== CONTRACTOR =====

  @Get('contractors/:contractorId/showcase')
  @ApiOperation({ summary: 'Получить витрину исполнителя (до 3 элементов)' })
  @ApiParam({ name: 'contractorId', description: 'ID исполнителя', example: 'ctr_123' })
  @ApiOkResponse({
    description: 'Упорядоченный список элементов витрины',
    schema: { $ref: getSchemaPath(ShowcaseListOut) },
  })
  async getContractor(@Param('contractorId') contractorId: string) {
    return this.service.getContractorShowcase(contractorId);
  }

  @Post('contractors/:contractorId/showcase')
  @ApiOperation({ summary: 'Полностью заменить витрину исполнителя (1..3 позиций)' })
  @ApiParam({ name: 'contractorId', example: 'ctr_123' })
  @ApiBody({
    type: SetShowcaseDto,
    examples: {
      full: {
        summary: '3 позиции (рекомендуется)',
        value: {
          items: [
            { attachmentId: 'att_1', position: 1 },
            { attachmentId: 'att_2', position: 2 },
            { attachmentId: 'att_3', position: 3 },
          ],
        },
      },
      legacyOrderField: {
        summary: 'Старое поле `order` (тоже принимается)',
        value: {
          items: [
            { attachmentId: 'att_7', order: 1 },
            { attachmentId: 'att_8', order: 2 },
          ],
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Актуальная витрина после замены',
    schema: { $ref: getSchemaPath(ShowcaseListOut) },
  })
  async setContractor(@Param('contractorId') contractorId: string, @Body() dto: SetShowcaseDto) {
    return this.service.setContractorShowcase(contractorId, dto);
  }

  @Patch('contractors/:contractorId/showcase/reorder')
  @ApiOperation({ summary: 'Переупорядочить витрину исполнителя (drag&drop)' })
  @ApiParam({ name: 'contractorId', example: 'ctr_123' })
  @ApiBody({
    type: ReorderShowcaseDto,
    examples: {
      reorder: {
        summary: 'Новый порядок из 2 элементов',
        value: { attachmentIds: ['att_2', 'att_1'] },
      },
    },
  })
  @ApiOkResponse({
    description: 'Актуальная витрина после переупорядочивания',
    schema: { $ref: getSchemaPath(ShowcaseListOut) },
  })
  async reorderContractor(
    @Param('contractorId') contractorId: string,
    @Body() dto: ReorderShowcaseDto,
  ) {
    return this.service.reorderContractorShowcase(contractorId, dto);
  }

  @Delete('contractors/:contractorId/showcase/:attachmentId')
  @ApiOperation({ summary: 'Удалить картинку из витрины исполнителя' })
  @ApiParam({ name: 'contractorId', example: 'ctr_123' })
  @ApiParam({ name: 'attachmentId', example: 'att_1' })
  @ApiOkResponse({
    description: 'Актуальная витрина после удаления',
    schema: { $ref: getSchemaPath(ShowcaseListOut) },
  })
  async removeContractor(
    @Param('contractorId') contractorId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.service.removeContractorShowcaseItem(contractorId, attachmentId);
  }
}
