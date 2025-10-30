import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class ShowcaseItemDto {
  @IsString()
  attachmentId!: string;

  @IsInt()
  @Min(1)
  @Max(3)
  position!: number;
}

export class SetShowcaseDto {
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => ShowcaseItemDto)
  items!: ShowcaseItemDto[];
}

/** Для drag&drop — просто массив attachmentId в порядке показа */
export class ReorderShowcaseDto {
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  attachmentIds!: string[];
}

export class RemoveShowcaseDto {
  @IsString()
  attachmentId!: string;
}
