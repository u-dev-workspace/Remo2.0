import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  Delete,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';
import { JwtGuard } from '../common/guards/jwt.guard';
import { CompanyService } from './company.service';
import {
  CreateCompanyDto,
  AddCompanyEmployeeDto,
  UpdateCompanyEmployeeRoleDto,
  UpdateCompanyEmployeePositionDto,
} from './dto/create-company.dto';

@ApiTags('company')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtGuard)
@Controller('companies')
export class CompanyController {
  constructor(private readonly service: CompanyService) {}

  // ====== СОЗДАНИЕ КОМПАНИИ ======
  @Post()
  async createCompany(@Body() dto: CreateCompanyDto, @Req() req: any) {
    const userId = req.user?.id; // беру id из токена
    return this.service.createCompany(dto, userId);
  }

  // ====== СОТРУДНИКИ ======
  @Get(':id/employees')
  async listEmployees(@Param('id') companyId: string) {
    return this.service.listCompanyEmployees(companyId);
  }

  @Post(':id/employees')
  async addEmployee(
    @Param('id') companyId: string,
    @Body() dto: AddCompanyEmployeeDto,
  ) {
    return this.service.addEmployeeToCompany(companyId, dto);
  }

  @Delete('employees/:employeeId')
  async removeEmployee(@Param('employeeId') employeeId: string) {
    return this.service.removeEmployee(employeeId);
  }

  @Patch('employees/:employeeId/role')
  async updateRole(
    @Param('employeeId') employeeId: string,
    @Body() dto: UpdateCompanyEmployeeRoleDto,
  ) {
    return this.service.updateEmployeeRole(employeeId, dto);
  }

  @Patch('employees/:employeeId/position')
  async updatePosition(
    @Param('employeeId') employeeId: string,
    @Body() dto: UpdateCompanyEmployeePositionDto,
  ) {
    return this.service.updateEmployeePosition(employeeId, dto);
  }
}
