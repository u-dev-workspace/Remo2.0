import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CityListQueryDto {
  @ApiPropertyOptional({ enum: ['nameRu', 'nameKk', 'nameEn', 'slug'], default: 'nameRu' })
  @IsOptional()
  @IsIn(['nameRu', 'nameKk', 'nameEn', 'slug'])
  sortBy?: 'nameRu'|'nameKk'|'nameEn'|'slug' = 'nameRu';

  @ApiPropertyOptional({ default: 100 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  take?: number = 100;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  cursor?: string; // cityId
}
