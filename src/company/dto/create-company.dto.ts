import { CompanyPurpose, CompanyRole } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty({
    example: 'Remo Logistics',
    description: 'Название компании',
  })
  @IsString()
  @Length(2, 255)
  name: string;

  @ApiPropertyOptional({
    example: 'Логистическая компания для доставки строительных материалов',
    description: 'Описание компании',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: CompanyPurpose,
    example: CompanyPurpose.LOGISTICS,
    description: 'Назначение компании: LOGISTICS | SERVICES | GOODS',
  })
  @IsEnum(CompanyPurpose)
  purpose: CompanyPurpose;
}

/**
 * DTO для добавления сотрудника в компанию по email.
 * Если пользователя с такой почтой нет — он будет создан.
 */
export class AddCompanyEmployeeDto {
  @ApiProperty({
    example: 'employee@company.kz',
    description: 'Email сотрудника (используется для поиска/создания User)',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    example: 'Иван Иванов',
    description: 'Имя сотрудника (если не указано — возьмём из email)',
  })
  @IsOptional()
  @IsString()
  @Length(2, 255)
  name?: string;

  @ApiPropertyOptional({
    enum: CompanyRole,
    example: CompanyRole.EMPLOYEE,
    description: 'Роль сотрудника в компании',
  })
  @IsOptional()
  @IsEnum(CompanyRole)
  role?: CompanyRole;

  @ApiPropertyOptional({
    example: 'Менеджер проектов',
    description: 'Должность сотрудника',
  })
  @IsOptional()
  @IsString()
  @Length(2, 255)
  position?: string;
}

export class UpdateCompanyEmployeeRoleDto {
  @ApiProperty({
    enum: CompanyRole,
    example: CompanyRole.MANAGEMENT,
    description: 'Новая роль сотрудника в компании',
  })
  @IsEnum(CompanyRole)
  role: CompanyRole;
}

export class UpdateCompanyEmployeePositionDto {
  @ApiProperty({
    example: 'Руководитель отдела продаж',
    description: 'Новая должность сотрудника',
  })
  @IsString()
  @Length(2, 255)
  position: string;
}
