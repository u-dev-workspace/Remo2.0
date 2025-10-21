import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, ArrayUnique, IsNotEmpty, IsOptional, IsString,
  IsEnum, IsNumber, IsInt, Min
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

// Если в Prisma у тебя enum PremisesType — используй его значения.
// Иначе можешь временно переключиться на string (см. комментарий ниже).
export enum PremisesType {
  APARTMENT = 'APARTMENT',
  HOUSE = 'HOUSE',
  OFFICE = 'OFFICE',
  RETAIL = 'RETAIL',
  WAREHOUSE = 'WAREHOUSE',
  OTHER = 'OTHER',
}

export class CreateProjectDto {
  @ApiProperty() @IsString() @IsNotEmpty() title: string;
  @ApiProperty() @IsString() @IsNotEmpty() description: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;

  // временно, пока нет auth
  @ApiProperty({ description: 'ID пользователя-владельца проекта' })
  @IsString() @IsNotEmpty() clientId: string;

  @ApiPropertyOptional({ type: [String], description: 'Список ID категорий' })
  @IsOptional() @IsArray() @ArrayUnique() categoryIds?: string[];

  // --- НОВЫЕ ПОЛЯ ---

  @ApiPropertyOptional({ enum: PremisesType })
  @IsOptional() @IsEnum(PremisesType) // если нет enum в Prisma, замени на: @IsString()
  propertyType?: PremisesType;        // либо: propertyType?: string;

  @ApiPropertyOptional({ description: 'Площадь, кв.м' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  area?: number;

  @ApiPropertyOptional({ description: 'Предполагаемый бюджет (целое число, например KZT)' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @Type(() => Number)
  @IsInt()
  @Min(0)
  budgetEstimated?: number;
}
