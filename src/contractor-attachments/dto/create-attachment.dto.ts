import { ApiProperty } from '@nestjs/swagger';

export class CreateAttachmentDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'Файл' })
  file: any;
}
