import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateContractorDto {
  @ApiPropertyOptional({ example: 'BuildMaster LLC', description: 'Название компании' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ example: 'Мы занимаемся ремонтом квартир и домов', description: 'Описание компании' })
  @IsOptional()
  @IsString()
  about?: string;
}
