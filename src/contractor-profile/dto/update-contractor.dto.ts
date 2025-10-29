import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, ArrayUnique, ValidateNested } from 'class-validator';
import { ProjectServiceInput } from '../../projects/dto/project-service-input.dto';
import { Type } from 'class-transformer';
import { ContractorServiceInput } from './contractor-service-input.dto';

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


  @ApiPropertyOptional({
    description: 'Набор услуг для исполнителя c (опционально) выбранными категориями внутри каждой услуги',
    type: [ProjectServiceInput],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractorServiceInput)
  services?: ContractorServiceInput[];

}
