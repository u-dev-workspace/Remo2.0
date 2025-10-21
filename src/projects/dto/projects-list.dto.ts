import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

const PREMISES_TYPES = ['APARTMENT','HOUSE','OFFICE','RETAIL','WAREHOUSE','OTHER'] as const;
export type PremisesType = typeof PREMISES_TYPES[number];

export class ProjectsListQueryDto {
  @ApiPropertyOptional({ enum: PREMISES_TYPES })
  @IsOptional()
  @IsIn(PREMISES_TYPES as unknown as string[])
  propertyType?: PremisesType;

  @ApiPropertyOptional({ description: 'Минимальная площадь, кв.м' })
  @IsOptional() @IsNumber() @Min(0)
  areaFrom?: number;

  @ApiPropertyOptional({ description: 'Максимальная площадь, кв.м' })
  @IsOptional() @IsNumber() @Min(0)
  areaTo?: number;

  @ApiPropertyOptional({ description: 'Минимальный бюджет' })
  @IsOptional() @IsInt() @Min(0)
  budgetFrom?: number;

  @ApiPropertyOptional({ description: 'Максимальный бюджет' })
  @IsOptional() @IsInt() @Min(0)
  budgetTo?: number;

  // уже существующие у тебя поля:
  @ApiPropertyOptional() @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'ID категории или множественный массив ?category=...&category=...' })
  @IsOptional()
  category?: string | string[];

  @ApiPropertyOptional() @IsOptional() @IsString()
  city?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value)) // пустую строку → undefined
  @Type(() => Number)                                          // строку → number
  @IsInt()
  @Min(1)
  take?: number;

  @ApiPropertyOptional({ description: 'Только мои проекты' })
  @IsOptional()
  mine?: string; // 'true' | 'false'
}
