import { ApiProperty } from '@nestjs/swagger';

export class AttachmentLinkDto {
  @ApiProperty() id: string;
  @ApiProperty() filename: string;
  @ApiProperty() url: string;
  @ApiProperty({ required: false, nullable: true }) mimetype?: string | null;
  @ApiProperty() size: number;
  @ApiProperty() createdAt: Date;
}
