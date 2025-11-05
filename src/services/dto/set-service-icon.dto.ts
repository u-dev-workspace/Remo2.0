// src/services/dto/set-service-icon.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SetServiceIconDto {
  @ApiProperty({ example: 'https://cdn.example.com/service-icons/123.png' })
  @IsString()
  iconUrl: string;
}
