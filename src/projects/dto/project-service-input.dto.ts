// src/projects/dto/project-service-input.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, ArrayUnique } from 'class-validator';

export class ProjectServiceInput {
  @ApiProperty({ description: 'Service.id' })
  @IsString()
  serviceId!: string;

  @ApiProperty({
    description: 'Подмножество Category.id из категорий этой услуги. Если не передать — возьмём все категории услуги',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  categoryIds?: string[];
}
