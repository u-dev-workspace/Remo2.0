import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UserController } from './user.controller';
import { ProjectsService } from '../projects/projects.service';
import { UserService } from './user.service';

@Module({
  controllers: [UserController],
  providers: [UserService, PrismaService],
  exports: [UserService],
})
export class UserModule {}
