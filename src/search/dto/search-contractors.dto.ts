import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SearchContractorsQueryDto {
  @ApiPropertyOptional({ description: 'ID города (City.id)' })
  @IsOptional() @IsString()
  cityId?: string;

  @ApiPropertyOptional({ description: 'Город по slug (almaty, astana, ...)' })
  @IsOptional() @IsString()
  citySlug?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  take?: number = 20;

  @ApiPropertyOptional({ description: 'Курсор (Contractor.id)' })
  @IsOptional() @IsString()
  cursor?: string;
}
