import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListFavoritesDto {
  @ApiPropertyOptional({ example: 20, description: 'Сколько вернуть (пагинация)' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  take?: number = 20;

  @ApiPropertyOptional({ example: 'fav_cursor_id', description: 'Cursor ID для пагинации (id Favorite.created)' })
  @IsOptional() @IsString()
  cursor?: string;
}
