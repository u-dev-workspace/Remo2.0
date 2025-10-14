import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, ArrayUnique } from 'class-validator';

export class UpdateContractorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  about?: string;

  // Если передано — ПОЛНАЯ замена списка категорий
  @ApiPropertyOptional({ type: [String], description: 'Полная замена категорий исполнителя' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  categoryIds?: string[];
}

export class AddCategoriesDto {
  @ApiPropertyOptional({ type: [String], description: 'Категории для добавления' })
  @IsArray()
  @ArrayUnique()
  categoryIds: string[];
}
