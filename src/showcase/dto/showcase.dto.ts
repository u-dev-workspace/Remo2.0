import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsInt, IsString, Max, Min, ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ShowcaseItemDto {
  @ApiProperty({ description: 'ID вложения', example: 'att_123' })
  @IsString()
  attachmentId!: string;

  @ApiProperty({ description: 'Позиция показа (1..3)', minimum: 1, maximum: 3, example: 1 })
  @IsInt()
  @Min(1)
  @Max(3)
  position!: number;
}

export class SetShowcaseDto {
  @ApiProperty({
    description: 'Полный набор элементов витрины (до 3)',
    type: [ShowcaseItemDto],
    maxItems: 3,
    example: { items: [
        { attachmentId: 'att_1', position: 1 },
        { attachmentId: 'att_2', position: 2 },
        { attachmentId: 'att_3', position: 3 },
      ]},
  })
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => ShowcaseItemDto)
  items!: ShowcaseItemDto[];
}

/** Для drag&drop — просто массив attachmentId в порядке показа */
export class ReorderShowcaseDto {
  @ApiProperty({
    description: 'attachmentId в порядке показа (до 3)',
    type: [String],
    maxItems: 3,
    example: { attachmentIds: ['att_2', 'att_3', 'att_1'] },
  })
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  attachmentIds!: string[];
}

export class RemoveShowcaseDto {
  @ApiProperty({ example: 'att_1' })
  @IsString()
  attachmentId!: string;
}
