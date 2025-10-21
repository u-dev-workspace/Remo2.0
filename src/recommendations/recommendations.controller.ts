import { Controller, Get, Param, Query, Req, UnauthorizedException, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtGuard } from '../common/guards/jwt.guard';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
class RecommendForClientQueryDto {
  take?: number;
  cityId?: string;
  excludeSelf?: string; // 'true' | 'false'
}
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
    @Query('cityId') cityId?: string,
    @Query('take') take = '20',
    @Query('cursor') cursor?: string,
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    if (!userId) throw new UnauthorizedException('No authenticated user');
    return this.service.projectsForContractor(userId, {
      status,
      cityId,
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

  @Get('projects/home')
  async homeProjects(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
      query: { take?: number; cursor?: string; cityId?: string; status?: 'OPEN' | 'IN_TALK' | 'CLOSED' | 'ARCHIVED' },
  ) {
    const take = Number.isFinite(Number(query.take)) ? Number(query.take) : 20;
    return this.service.homeProjects({
      take,
      cursor: query.cursor,
      cityId: query.cityId,
      status: query.status,
    });
  }

  @UseGuards(JwtGuard)
  @Get('contractors/for-client')
  async recommendForClient(
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: RecommendForClientQueryDto,
    @Req() req: any,
  ) {
    const take = Number.isFinite(Number(query.take)) ? Number(query.take) : 20;
    const excludeSelf = query.excludeSelf === 'false' ? false : true;

    return this.service.recommendContractorsForClient(req.user?.id, {
      take,
      cityId: query.cityId,
      excludeSelf,
    });
  }
}
