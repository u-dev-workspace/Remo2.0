import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ShowcaseService } from './showcase.service';
import { ReorderShowcaseDto, SetShowcaseDto } from './dto/showcase.dto';
import { JwtGuard } from '../common/guards/jwt.guard';

@ApiTags('Showcase')
@Controller('ShowCases')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ShowcaseController {
  constructor(private readonly service: ShowcaseService) {}

  // -------- PROJECT --------
  @Get('projects/:projectId/showcase')
  @ApiOperation({ summary: 'Получить витрину (до 3) для проекта' })
  async getProject(@Param('projectId') projectId: string) {
    return this.service.getProjectShowcase(projectId);
  }

  @Post('projects/:projectId/showcase')
  @ApiOperation({ summary: 'Полностью заменить витрину проекта (1..3) позициями' })
  @ApiBody({ type: SetShowcaseDto })
  async setProject(@Param('projectId') projectId: string, @Body() dto: SetShowcaseDto) {
    return this.service.setProjectShowcase(projectId, dto);
  }

  @Patch('projects/:projectId/showcase/reorder')
  @ApiOperation({ summary: 'Переупорядочить витрину проекта drag&drop' })
  @ApiBody({ type: ReorderShowcaseDto })
  async reorderProject(@Param('projectId') projectId: string, @Body() dto: ReorderShowcaseDto) {
    return this.service.reorderProjectShowcase(projectId, dto);
  }

  @Delete('projects/:projectId/showcase/:attachmentId')
  @ApiOperation({ summary: 'Убрать картинку из витрины проекта' })
  async removeProject(
    @Param('projectId') projectId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.service.removeProjectShowcaseItem(projectId, attachmentId);
  }

  // -------- CONTRACTOR --------
  @Get('contractors/:contractorId/showcase')
  @ApiOperation({ summary: 'Получить витрину (до 3) для исполнителя' })
  async getContractor(@Param('contractorId') contractorId: string) {
    return this.service.getContractorShowcase(contractorId);
  }

  @Post('contractors/:contractorId/showcase')
  @ApiOperation({ summary: 'Полностью заменить витрину исполнителя (1..3) позициями' })
  @ApiBody({ type: SetShowcaseDto })
  async setContractor(@Param('contractorId') contractorId: string, @Body() dto: SetShowcaseDto) {
    return this.service.setContractorShowcase(contractorId, dto);
  }

  @Patch('contractors/:contractorId/showcase/reorder')
  @ApiOperation({ summary: 'Переупорядочить витрину исполнителя drag&drop' })
  @ApiBody({ type: ReorderShowcaseDto })
  async reorderContractor(@Param('contractorId') contractorId: string, @Body() dto: ReorderShowcaseDto) {
    return this.service.reorderContractorShowcase(contractorId, dto);
  }

  @Delete('contractors/:contractorId/showcase/:attachmentId')
  @ApiOperation({ summary: 'Убрать картинку из витрины исполнителя' })
  async removeContractor(
    @Param('contractorId') contractorId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.service.removeContractorShowcaseItem(contractorId, attachmentId);
  }
}
