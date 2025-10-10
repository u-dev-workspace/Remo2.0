import { ApiProperty } from '@nestjs/swagger';

export class ContractorAttachmentResponseDto {
  @ApiProperty({ example: 'cmgx12345', description: 'ID вложения' })
  id: string;

  @ApiProperty({ example: 'cmgj67890', description: 'ID исполнителя (Contractor)' })
  contractorId: string;

  @ApiProperty({
    example: 'https://localhost:9000/app-uploads/contractors/cmgj67890/image.png',
    description: 'Публичный URL файла',
  })
  url: string;

  @ApiProperty({ example: 'image/png', description: 'MIME тип файла' })
  mime: string;

  @ApiProperty({ example: 128000, description: 'Размер файла в байтах', required: false })
  sizeBytes?: number;

  @ApiProperty({ example: 'Фото компании', required: false })
  caption?: string;

  @ApiProperty({ example: 'contractors/cmgj67890/image.png', description: 'Object Key в MinIO' })
  objectKey: string;

  @ApiProperty({ example: false, description: 'Является ли обложкой', default: false })
  isCover?: boolean;

  @ApiProperty({ example: '2025-10-10T10:00:00Z', description: 'Дата загрузки' })
  createdAt: Date;
}
