import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class AddFavoriteDto {
  @ApiProperty({ example: 'cmh2dx83u00015fs8liojsd4p', description: 'ID проекта (cuid/uuid)' })
  @IsString()
  @Length(8, 64)
  projectId!: string;
}
