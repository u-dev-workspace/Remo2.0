// src/services/dto/presign-icon.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class PresignIconDto {
  @ApiProperty({ example: 'image/png' })
  @IsString()
  mime: string;

  @ApiProperty({ example: 150000 })
  @IsNumber()
  sizeBytes: number;
}
