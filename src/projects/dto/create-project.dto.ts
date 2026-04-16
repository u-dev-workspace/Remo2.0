import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, ArrayUnique, IsNotEmpty, IsOptional, IsString,
  IsEnum, IsNumber, IsInt, Min, ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ProjectStatus } from '@prisma/client';
import { ProjectServiceInput } from './project-service-input.dto';

// Если в Prisma у тебя есть enum PremisesType — оставь этот enum в DTO.
// (В Prisma-клиенте он будет как $Enums.PremisesType, но для валидации удобнее свой TS-enum.)
export enum PremisesType {
  APARTMENT = 'APARTMENT',
  HOUSE = 'HOUSE',
  OFFICE = 'OFFICE',
  RETAIL = 'RETAIL',
  WAREHOUSE = 'WAREHOUSE',
  OTHER = 'OTHER',
}

export class CreateProjectDto {
  @ApiPropertyOptional({
    description: 'Название проекта. Если не указано — проект сохраняется как черновик (DRAFT)',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Описание проекта' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'ID города (City.id)' })
  @IsOptional()
  @IsString()
  cityId?: string;

  @ApiPropertyOptional({ type: [String], description: 'Список ID категорий' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  categoryIds?: string[];

  // --- Новые поля под фильтры ---

  @ApiPropertyOptional({ enum: PremisesType })
  @IsOptional()
  @IsEnum(PremisesType)
  propertyType?: PremisesType;

  @ApiPropertyOptional({ description: 'Площадь, кв.м' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  area?: number;

  @ApiPropertyOptional({ description: 'Предполагаемый бюджет (целое число)' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @Type(() => Number)
  @IsInt()
  @Min(0)
  budgetEstimated?: number;

  @ApiPropertyOptional({
    enum: ProjectStatus,
    description: 'Статус проекта при создании. Если не указан — DRAFT когда нет title, OPEN когда title есть',
  })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({
    description: 'Набор услуг для проекта c (опционально) выбранными категориями внутри каждой услуги',
    type: [ProjectServiceInput],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectServiceInput)
  services?: ProjectServiceInput[];
}
