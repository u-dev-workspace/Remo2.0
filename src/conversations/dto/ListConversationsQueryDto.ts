import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ListConversationsQueryDto {
  @ApiPropertyOptional({ enum: ['client', 'contractor'], description: 'Фильтр по роли (необязательно)' })
  @IsOptional()
  @IsIn(['client', 'contractor'])
  role?: 'client' | 'contractor';

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number;

  @ApiPropertyOptional({ description: 'Курсор (conversationId)' })
  @IsOptional()
  @IsString()
  cursor?: string;
}
