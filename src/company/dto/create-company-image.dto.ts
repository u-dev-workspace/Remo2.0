import { ApiProperty } from '@nestjs/swagger';

export class CreateCompanyImageDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Файл изображения компании',
  })
  file: any;
}
