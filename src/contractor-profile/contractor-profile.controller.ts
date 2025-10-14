import { Controller, Get, Patch, Delete, Body, Req, UseGuards, Post, Param } from '@nestjs/common';
import { ContractorProfileService } from './contractor-profile.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AddCategoriesDto, UpdateContractorDto } from './dto/update-contractor.dto';
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
  @ApiOperation({ summary: 'Обновить профиль исполнителя (companyName, about, и опционально ПОЛНАЯ замена категорий)' })
  @ApiResponse({ status: 200, description: 'Профиль обновлён' })
  // @UseGuards(JwtAuthGuard)
  async updateProfile(@Req() req: any, @Body() data: UpdateContractorDto) {
    const userId = req.user.id; // или req.user.sub
    return this.contractorProfileService.updateProfile(userId, data);
  }

  @Post('me/categories')
  @ApiOperation({ summary: 'Добавить категории исполнителю (без удаления существующих)' })
  // @UseGuards(JwtAuthGuard)
  async addCategories(@Req() req: any, @Body() body: AddCategoriesDto) {
    const userId = req.user.id;
    return this.contractorProfileService.addCategories(userId, body);
  }

  @Delete('me/categories/:categoryId')
  @ApiOperation({ summary: 'Удалить одну категорию у исполнителя' })
  // @UseGuards(JwtAuthGuard)
  async removeCategory(@Req() req: any, @Param('categoryId') categoryId: string) {
    const userId = req.user.id;
    return this.contractorProfileService.removeCategory(userId, categoryId);
  }
  @Delete('me')
  async deleteProfile(@Req() req) {
    const userId = req.user?.id;
    return this.contractorProfileService.deleteProfile(userId);
  }
}
