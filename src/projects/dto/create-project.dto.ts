import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, ArrayUnique, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty() @IsString() @IsNotEmpty() title: string;
  @ApiProperty() @IsString() @IsNotEmpty() description: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;

  // временно, пока нет auth
  @ApiProperty({ description: 'ID пользователя-владельца проекта' })
  @IsString() @IsNotEmpty() clientId: string;

  @ApiPropertyOptional({ type: [String], description: 'Список ID категорий' })
  @IsOptional() @IsArray() @ArrayUnique() categoryIds?: string[];
}
