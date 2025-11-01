import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiExtraModels } from '@nestjs/swagger';
import { ShowcaseService } from './showcase.service';
import { ReorderShowcaseDto, SetShowcaseDto, ShowcaseItemDto } from './dto/showcase.dto';
import { JwtGuard } from '../common/guards/jwt.guard';

@ApiTags('Showcase')
@ApiBearerAuth('bearerAuth')
@ApiExtraModels(ShowcaseItemDto, SetShowcaseDto, ReorderShowcaseDto)
@UseGuards(JwtGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('ShowCases')
export class ShowcaseController {
  constructor(private readonly service: ShowcaseService) {}

  // -------- PROJECT --------
  @Get('projects/:projectId/showcase')
  @ApiOperation({ summary: 'Получить витрину (до 3) для проекта' })
  @ApiParam({ name: 'projectId', description: 'ID проекта', example: 'prj_123' })
  @ApiOkResponse({ description: 'Текущая витрина проекта', schema: {
      type: 'array',
      items: { $ref: '#/components/schemas/ShowcaseItemDto' },
    }})
  async getProject(@Param('projectId') projectId: string) {
    return this.service.getProjectShowcase(projectId);
  }

  @Post('projects/:projectId/showcase')
  @ApiOperation({ summary: 'Полностью заменить витрину проекта (1..3) позициями' })
  @ApiParam({ name: 'projectId', description: 'ID проекта', example: 'prj_123' })
  @ApiBody({
    type: SetShowcaseDto,
    examples: {
      minimal: {
        summary: 'Минимум 1 элемент',
        value: { items: [{ attachmentId: 'att_1', order: 1 }] },
      },
      full: {
        summary: 'Полный набор (3 элемента)',
        value: {
          items: [
            { attachmentId: 'att_1', order: 1 },
            { attachmentId: 'att_2', order: 2 },
            { attachmentId: 'att_3', order: 3 },
          ],
        },
      },
    },
  })
  async setProject(@Param('projectId') projectId: string, @Body() dto: SetShowcaseDto) {
    return this.service.setProjectShowcase(projectId, dto);
  }

  @Patch('projects/:projectId/showcase/reorder')
  @ApiOperation({ summary: 'Переупорядочить витрину проекта drag&drop' })
  @ApiParam({ name: 'projectId', description: 'ID проекта', example: 'prj_123' })
  @ApiBody({
    type: ReorderShowcaseDto,
    examples: {
      reorder: {
        value: { orderedAttachmentIds: ['att_2', 'att_3', 'att_1'] },
      },
    },
  })
  async reorderProject(@Param('projectId') projectId: string, @Body() dto: ReorderShowcaseDto) {
    return this.service.reorderProjectShowcase(projectId, dto);
  }

  @Delete('projects/:projectId/showcase/:attachmentId')
  @ApiOperation({ summary: 'Убрать картинку из витрины проекта' })
  @ApiParam({ name: 'projectId', example: 'prj_123' })
  @ApiParam({ name: 'attachmentId', example: 'att_1' })
  async removeProject(@Param('projectId') projectId: string, @Param('attachmentId') attachmentId: string) {
    return this.service.removeProjectShowcaseItem(projectId, attachmentId);
  }

  // -------- CONTRACTOR --------
  @Get('contractors/:contractorId/showcase')
  @ApiOperation({ summary: 'Получить витрину (до 3) для исполнителя' })
  @ApiParam({ name: 'contractorId', description: 'ID исполнителя', example: 'ctr_123' })
  @ApiOkResponse({ description: 'Текущая витрина исполнителя', schema: {
      type: 'array',
      items: { $ref: '#/components/schemas/ShowcaseItemDto' },
    }})
  async getContractor(@Param('contractorId') contractorId: string) {
    return this.service.getContractorShowcase(contractorId);
  }

  @Post('contractors/:contractorId/showcase')
  @ApiOperation({ summary: 'Полностью заменить витрину исполнителя (1..3) позициями' })
  @ApiParam({ name: 'contractorId', example: 'ctr_123' })
  @ApiBody({ type: SetShowcaseDto })
  async setContractor(@Param('contractorId') contractorId: string, @Body() dto: SetShowcaseDto) {
    return this.service.setContractorShowcase(contractorId, dto);
  }

  @Patch('contractors/:contractorId/showcase/reorder')
  @ApiOperation({ summary: 'Переупорядочить витрину исполнителя drag&drop' })
  @ApiParam({ name: 'contractorId', example: 'ctr_123' })
  @ApiBody({ type: ReorderShowcaseDto })
  async reorderContractor(@Param('contractorId') contractorId: string, @Body() dto: ReorderShowcaseDto) {
    return this.service.reorderContractorShowcase(contractorId, dto);
  }

  @Delete('contractors/:contractorId/showcase/:attachmentId')
  @ApiOperation({ summary: 'Убрать картинку из витрины исполнителя' })
  @ApiParam({ name: 'contractorId', example: 'ctr_123' })
  @ApiParam({ name: 'attachmentId', example: 'att_1' })
  async removeContractor(@Param('contractorId') contractorId: string, @Param('attachmentId') attachmentId: string) {
    return this.service.removeContractorShowcaseItem(contractorId, attachmentId);
  }
}
