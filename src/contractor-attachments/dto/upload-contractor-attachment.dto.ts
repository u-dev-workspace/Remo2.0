import { ApiProperty } from '@nestjs/swagger';

export class UploadContractorAttachmentDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Файл для загрузки (image/jpeg, image/png и т.д.)',
  })
  file: any;
}
