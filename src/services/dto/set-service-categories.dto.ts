import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsString } from 'class-validator';

export class SetServiceCategoriesDto {
  @ApiProperty({ type: [String], description: 'Полный список категорий (заменит текущие)' })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  categoryIds: string[];
}
