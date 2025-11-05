// src/services/dto/set-service-cover.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetServiceCoverDto {
  @ApiProperty({ example: true, description: 'Отображать ли услугу на обложке' })
  @IsBoolean()
  isCoverser: boolean;
}
