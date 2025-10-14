import { Controller, Get, Param, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtGuard } from '../common/guards/jwt.guard';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Recommendations')
@ApiBearerAuth('bearerAuth')
@Controller('recommendations')
@UseGuards(JwtGuard)
export class RecommendationsController {
  constructor(private readonly service: RecommendationsService) {}

  // 1) Проекты для исполнителя (me) по категориям
  @Get('me/projects')
  @ApiOperation({ summary: 'Рекомендации проектов для исполнителя по его категориям' })

  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  async projectsForContractorMe(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('city') city?: string,
    @Query('take') take = '20',
    @Query('cursor') cursor?: string,
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    if (!userId) throw new UnauthorizedException('No authenticated user');
    return this.service.projectsForContractor(userId, {
      status,
      city,
      take: Number(take) || 20,
      cursor,
    });
  }

  // 2) Исполнители для проекта по категориям проекта
  @Get('projects/:projectId/contractors')
  @ApiOperation({ summary: 'Рекомендованные исполнители для проекта по категориям проекта' })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'take', required: false, description: 'Кол-во (по умолчанию 20)' })
  async contractorsForProject(
    @Param('projectId') projectId: string,
    @Query('city') city?: string,
    @Query('take') take = '20',
  ) {
    return this.service.contractorsForProject(projectId, { city, take: Number(take) || 20 });
  }
}
