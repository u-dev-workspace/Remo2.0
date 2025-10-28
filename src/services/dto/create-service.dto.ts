import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ description: 'Уникальный slug (латиницей), например pokraska-sten' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ description: 'Название услуги' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Описание' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Активна ли услуга', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Список ID категорий (Category.id)' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  categoryIds?: string[];
}
