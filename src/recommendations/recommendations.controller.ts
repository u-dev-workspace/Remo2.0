import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { JwtGuard } from '../common/guards/jwt.guard';

@ApiTags('Recommendations')
@Controller('recommendations')
@ApiBearerAuth('bearerAuth')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class RecommendationsController {
  constructor(private readonly service: RecommendationsService) {}

  @Get('contractors/by-project/:projectId')
  @ApiOperation({ summary: 'Рекомендовать исполнителей по услугам проекта' })
  @ApiOkResponse({ description: 'Список исполнителей (matchScore убыв.)' })
  @ApiQuery({ name: 'take', required: false, description: '1..100, по умолчанию 20' })
  async contractorsByProject(
    @Param('projectId') projectId: string,
    @Query('take') take?: string,
  ) {
    return this.service.recommendContractorsForProject(projectId, {
      take: Number.isFinite(Number(take)) ? Number(take) : 20,
    });
  }
  @UseGuards(JwtGuard)
  @Get('projects/by-contractor')
  @ApiOperation({ summary: 'Рекомендовать проекты по услугам исполнителя' })
  @ApiOkResponse({ description: 'Список проектов (matchScore убыв.)' })
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'onlyOpen', required: false, description: 'true (по умолчанию) | false' })
  async projectsByContractor(
    @Req() req,
    @Query('take') take?: string,
    @Query('onlyOpen') onlyOpen?: string,
  ) {
    return this.service.recommendProjectsForContractor(req.user?.id, {
      take: Number.isFinite(Number(take)) ? Number(take) : 20,
      onlyOpen: onlyOpen !== 'false',
    });
  }

  @Get('contractors/for-client')
  @ApiOperation({ summary: 'Исполнители для текущего клиента по услугам всех его проектов' })
  @ApiOkResponse({ description: 'Список исполнителей (matchScore убыв.)' })
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @ApiQuery({ name: 'take', required: false })
  async contractorsForClient(@Req() req: any, @Query('take') take?: string) {
    const userId: string | undefined = req.user?.id;
    if (!userId) throw new UnauthorizedException('Auth required');
    return this.service.recommendContractorsForClient(userId, {
      take: Number.isFinite(Number(take)) ? Number(take) : 20,
    });
  }
}
