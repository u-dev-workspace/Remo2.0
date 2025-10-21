import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CitySuggestQueryDto {
  @ApiPropertyOptional({ description: 'Язык подсказок', enum: ['ru','kk','en'], default: 'ru' })
  @IsOptional() @IsIn(['ru','kk','en'])
  lang?: 'ru'|'kk'|'en' = 'ru';

  @ApiPropertyOptional({ description: 'Поисковая строка (минимум 1 символ)' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : String(value)))
  @IsString()
  q?: string;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  take?: number = 10;
}
