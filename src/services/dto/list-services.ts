import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBooleanString, IsInt, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ListServicesQueryDto {
  @ApiPropertyOptional({ description: 'Поиск по имени/описанию' })
  @IsOptional() @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Фильтр по категории (Category.id)' })
  @IsOptional() @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Только активные', default: 'true' })
  @IsOptional() @IsBooleanString()
  active?: 'true' | 'false';

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  take?: number;

  @ApiPropertyOptional({ description: 'Курсор (Service.id)' })
  @IsOptional() @IsString()
  cursor?: string;
}
