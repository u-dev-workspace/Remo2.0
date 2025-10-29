import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
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

  // 1) Исполнители для конкретного проекта
  @Get('contractors/by-project/:projectId')
  @ApiOkResponse({ description: 'Список исполнителей, отсортированных по matchScore' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async contractorsByProject(
    @Param('projectId') projectId: string,
    @Query('take') take?: string,
    @Query('sameCityBoost') sameCityBoost?: string, // 'true' | 'false'
  ) {
    return this.service.recommendContractorsForProject(projectId, {
      take: Number.isFinite(Number(take)) ? Number(take) : 20,
      sameCityBoost: sameCityBoost !== 'false',
    });
  }

  // 2) Проекты для конкретного исполнителя
  @Get('projects/by-contractor/:contractorId')
  @ApiOkResponse({ description: 'Список проектов, отсортированных по matchScore' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async projectsByContractor(
    @Param('contractorId') contractorId: string,
    @Query('take') take?: string,
    @Query('onlyOpen') onlyOpen?: string,
    @Query('sameCityBoost') sameCityBoost?: string,
  ) {
    return this.service.recommendProjectsForContractor(contractorId, {
      take: Number.isFinite(Number(take)) ? Number(take) : 20,
      onlyOpen: onlyOpen !== 'false',
      sameCityBoost: sameCityBoost !== 'false',
    });
  }

  // 3) Исполнители для клиента (агрегируем все его проекты)
  @Get('contractors/for-client')
  @ApiOkResponse({ description: 'Исполнители для клиента по услугам всех его проектов' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async contractorsForClient(
    @Req() req: any,
    @Query('take') take?: string,
    @Query('sameCityBoost') sameCityBoost?: string,
  ) {
    const userId = req.user?.id;
    return this.service.recommendContractorsForClient(userId, {
      take: Number.isFinite(Number(take)) ? Number(take) : 20,
      sameCityBoost: sameCityBoost !== 'false',
    });
  }
}
