import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { MinioFileInfo } from '../uploads/types';

@Injectable()
export class ContractorAttachmentsService {
  constructor(
    public readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
  ) {}

  async uploadAttachment(contractorId: string, file: any) {
    try {
      console.log('🚀 uploadAttachment called:', { contractorId, file: file.filename });

      const uploaded = await this.uploads.uploadStream(file, 'contractor'); // <-- тут, возможно, ошибка
      console.log('✅ Uploaded to MinIO:', uploaded);

      return await this.prisma.contractorAttachment.create({
        data: {
          contractorId,
          url: uploaded.url,
          mime: file.mimetype,
          objectKey: uploaded.objectKey,
          sizeBytes: file.file.bytesRead,
        },
      });
    } catch (err) {
      console.error('❌ uploadAttachment error:', err);
      throw err;
    }
  }


  async getAttachments(contractorId: string) {
    return this.prisma.contractorAttachment.findMany({
      where: { contractorId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async deleteAttachment(id: string) {
    const attachment = await this.prisma.contractorAttachment.findUnique({ where: { id } });
    if (!attachment) throw new NotFoundException('Attachment not found');

    await this.uploads.deleteObject(attachment.objectKey); // ✅ правильный метод
    await this.prisma.contractorAttachment.delete({ where: { id } });

    return { message: 'Deleted successfully' };
  }
}
