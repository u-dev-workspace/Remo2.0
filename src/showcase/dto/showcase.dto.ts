import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Один элемент витрины.
 * Backend принимает поле `position` (1..3).
 * Дополнительно, ради обратной совместимости, понимаем `order` и маппим его в `position`.
 */
export class ShowcaseItemDto {
  @ApiProperty({
    description: 'ID вложения (attachment) для витрины',
    example: 'att_123',
  })
  @IsString()
  attachmentId!: string;

  @ApiProperty({
    description: 'Позиция показа (1 — первая; максимум 3)',
    minimum: 1,
    maximum: 3,
    example: 1,
  })
  @Transform(({ obj, value }) => obj?.position ?? obj?.order ?? value) // позволяем прислать `order`
  @Type(() => Number) // "1" -> 1
  @IsInt()
  @Min(1)
  @Max(3)
  position!: number;
}

/** Тело для полного задания витрины (замена 1..3 позиций). */
export class SetShowcaseDto {
  @ApiProperty({
    description: 'Полный список карточек витрины (1–3 элементов). Старое содержимое заменяется.',
    type: [ShowcaseItemDto],
    minItems: 1,
    maxItems: 3,
    examples: {
      minimal: {
        summary: 'Минимум 1 элемент',
        value: {
          items: [{ attachmentId: 'att_1', position: 1 }],
        },
      },
      full: {
        summary: 'Полные 3 позиции',
        value: {
          items: [
            { attachmentId: 'att_1', position: 1 },
            { attachmentId: 'att_2', position: 2 },
            { attachmentId: 'att_3', position: 3 },
          ],
        },
      },
      legacyOrderField: {
        summary: 'Поддержка старого поля `order`',
        value: {
          items: [
            { attachmentId: 'att_1', order: 1 },
            { attachmentId: 'att_2', order: 2 },
          ],
        },
      },
    },
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => ShowcaseItemDto)
  items!: ShowcaseItemDto[];
}

/** Для drag&drop — массив attachmentId в новом порядке (слева направо). */
export class ReorderShowcaseDto {
  @ApiProperty({
    description: 'attachmentId в порядке показа (1-й — слева)',
    type: [String],
    minItems: 1,
    maxItems: 3,
    examples: {
      twoItems: {
        summary: 'Переупорядочивание 2 элементов',
        value: { attachmentIds: ['att_2', 'att_1'] },
      },
      threeItems: {
        summary: 'Полные 3 позиции',
        value: { attachmentIds: ['att_3', 'att_1', 'att_2'] },
      },
    },
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  attachmentIds!: string[];
}

/** Унифицированный ответ: список элементов витрины. */
export class ShowcaseItemOut {
  @ApiProperty({ example: 'att_1' })
  attachmentId!: string;

  @ApiProperty({ example: 1, minimum: 1, maximum: 3 })
  position!: number;
}

export class ShowcaseListOut {
  @ApiProperty({
    description: 'Текущие элементы витрины упорядоченные по position',
    type: [ShowcaseItemOut],
  })
  items!: ShowcaseItemOut[];
}
