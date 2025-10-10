import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ContractorProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfileByUserId(userId: string) {
    console.log('userId =>', userId);
    const contractor = await this.prisma.contractor.findUnique({
      where: { userId },
    });
    console.log('contractor =>', contractor);
    if (!contractor) throw new NotFoundException('Contractor profile not found');
    return contractor;
  }


  async updateProfile(userId: string, data: Prisma.ContractorUpdateInput) {
    const contractor = await this.prisma.contractor.findUnique({ where: { userId } });
    if (!contractor) throw new NotFoundException('Profile not found');

    return this.prisma.contractor.update({
      where: { userId },
      data: {
        companyName: data.companyName,
        about: data.about,
      },
    });
  }



  async deleteProfile(userId: string) {
    return this.prisma.contractor.delete({ where: { userId } });
  }

  async createProfile(userId: string) {
    return this.prisma.contractor.create({
      data: { userId },
    });
  }
}
