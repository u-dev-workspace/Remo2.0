import { Controller, Get, Patch, Delete, Body, Req, UseGuards } from '@nestjs/common';
import { ContractorProfileService } from './contractor-profile.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UpdateContractorDto } from './dto/update-contractor.dto';
@ApiTags('Contractor Profile') // ← появится группа в Swagger
@ApiBearerAuth('bearerAuth')
@Controller('api/v1/contractor-profile')
@UseGuards(JwtGuard)
export class ContractorProfileController {
  constructor(private readonly contractorProfileService: ContractorProfileService) {}

  @Get('me')
  async getProfile(@Req() req) {
    const userId = req.user?.id;
    return this.contractorProfileService.getProfileByUserId(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Обновить профиль исполнителя' })
  @ApiResponse({ status: 200, description: 'Профиль обновлён' })
  async updateProfile(@Req() req, @Body() data: UpdateContractorDto) {
    const userId = req.user.id;
    return this.contractorProfileService.updateProfile(userId, data);
  }
  @Delete('me')
  async deleteProfile(@Req() req) {
    const userId = req.user?.id;
    return this.contractorProfileService.deleteProfile(userId);
  }
}
