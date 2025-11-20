import {
  Controller, Get, Query, Req, UseGuards, UsePipes, ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { CityListQueryDto } from './dto/city-list.dto';
import { CitySuggestQueryDto } from './dto/city-suggest.dto';
import { SearchContractorsQueryDto } from './dto/search-contractors.dto';
import { SearchProjectsQueryDto } from './dto/search-projects.dto';
import { JwtGuard } from '../common/guards/jwt.guard';

@ApiTags('Search')
@ApiBearerAuth('bearerAuth')
  // убери, если эти ручки публичные
@Controller('api/v1')
export class SearchController {
  constructor(private readonly service: SearchService) {}

  // Cities
  @Get('cities')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  listCities(@Query() query: CityListQueryDto) {
    return this.service.listCities(query);
  }

  @Get('cities/suggest')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  suggestCities(@Query() query: CitySuggestQueryDto) {
    return this.service.suggestCities(query);
  }

  // Contractors by city

  @Get('search/contractors')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  contractors(@Query() query: SearchContractorsQueryDto,@Req() req: any ) {
    return this.service.searchContractors(query, req?.user?.id);
  }

  // Projects by city
  @Get('search/projects')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  projects(@Query() query: SearchProjectsQueryDto) {
    return this.service.searchProjects(query);
  }
}
