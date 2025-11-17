// conversations/dto/ListConversationsQueryDto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListConversationsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'ID проекта для фильтрации' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ enum: ['client', 'contractor'] })
  @IsOptional()
  @IsEnum(['client', 'contractor'])
  role?: 'client' | 'contractor';

  @ApiPropertyOptional({ description: 'Только чаты с непрочитанными сообщениями' })
  @IsOptional()
  @Type(() => Boolean)
  onlyWithUnread?: boolean;
}
