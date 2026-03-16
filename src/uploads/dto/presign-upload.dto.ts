import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PresignUploadDto {
  @ApiProperty({ description: 'ID проекта', example: 'clz123abc' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ description: 'MIME-тип файла', example: 'image/jpeg' })
  @IsString()
  @IsNotEmpty()
  mime: string;

  @ApiProperty({ description: 'Размер файла в байтах', example: 1048576 })
  @IsInt()
  @Min(1)
  sizeBytes: number;

  @ApiPropertyOptional({ description: 'Расширение файла', example: 'jpg' })
  @IsOptional()
  @IsString()
  ext?: string;
}
