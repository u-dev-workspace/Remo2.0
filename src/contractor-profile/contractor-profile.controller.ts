import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Req,
  UseGuards,
  Param,
  Put,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { ContractorProfileService } from './contractor-profile.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UpdateContractorDto } from './dto/update-contractor.dto';
import { ContractorServiceInput } from './dto/contractor-service-input.dto';
import { SetContractorServicesDto } from './dto/set-contractor-services.dto';
@ApiTags('Contractor Profile') // ← появится группа в Swagger
@ApiBearerAuth('bearerAuth')
@Controller('api/v1/contractor-profile')
export class ContractorProfileController {
  constructor(private readonly contractorProfileService: ContractorProfileService) {}
  @UseGuards(JwtGuard)
  @Get('me')
  async getProfile(@Req() req) {
    const userId = req.user?.id;
    return this.contractorProfileService.getProfileByUserId(userId);
  }

  @Get('profile/:contractorId')
  async getProfileById(@Req() req: any, @Param('contractorId') contractorId : string ) {
    return this.contractorProfileService.getProfileByContractorId(contractorId);
  }
  @UseGuards(JwtGuard)
  @Patch('me')
  @ApiOperation({ summary: 'Обновить профиль исполнителя (companyName, about, и опционально ПОЛНАЯ замена категорий)' })
  @ApiResponse({ status: 200, description: 'Профиль обновлён' })
  async updateProfile(@Req() req: any, @Body() data: UpdateContractorDto) {
    const userId = req.user.id; // или req.user.sub
    return this.contractorProfileService.updateProfile(userId, data);
  }
  @UseGuards(JwtGuard)
  @Delete('me')
  async deleteProfile(@Req() req) {
    const userId = req.user?.id;
    return this.contractorProfileService.deleteProfile(userId);
  }

  @UseGuards(JwtGuard)
  @Put(':contractorId/services')
  @ApiOperation({ summary: 'Полная замена перечня услуг исполнителя и их выбранных категорий' })
  @ApiOkResponse({ description: 'Профиль исполнителя с актуальными услугами' })
  @ApiBody({ type: SetContractorServicesDto })
  async setServices(
    @Param('contractorId') contractorId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) body: SetContractorServicesDto,
    @Req() req: any,
  ) {
    if (!body?.services?.length) {
      throw new BadRequestException('Body must have non-empty "services" array');
    }
    return this.contractorProfileService.setServices(contractorId, body.services, req.user?.id);
  }

  @Get('rating/by-contractor/:contractorId')
  @ApiOperation({ summary: 'Глобальный рейтинг исполнителя по contractorId' })
  @ApiOkResponse({
    description: 'Глобальный рейтинг исполнителя',
    schema: {
      example: {
        contractorId: 'ctr_123',
        reviewsCount: 10,
        averageRating: 4.6,
      },
    },
  })
  async getRatingByContractorId(@Param('contractorId') contractorId: string) {
    return this.contractorProfileService.getGlobalRatingByContractorId(contractorId);
  }

  @Get('rating/by-user')
  @ApiOperation({ summary: 'Глобальный рейтинг исполнителя по userId владельца профиля ТОЛЬКО ДЛЯ ИСПОЛНИТЕЛЯ!!!' })
  @ApiOkResponse({
    description: 'Глобальный рейтинг исполнителя',
    schema: {
      example: {
        contractorId: 'ctr_123',
        reviewsCount: 10,
        averageRating: 4.6,
      },
    },
  })
  async getRatingByUserId(@Req() req: any) {
    return this.contractorProfileService.getGlobalRatingByUserId(req.user?.id);
  }
}
