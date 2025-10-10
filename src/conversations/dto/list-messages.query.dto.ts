import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class ListMessagesQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 30;
}
