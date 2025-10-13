// import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
// import { ProjectsService } from './projects.service';
// import { JwtGuard } from '../common/guards/jwt.guard';
// import { CreateProjectDto } from './dto';
// import { ProjectOwnerGuard } from '../common/guards/project-owner.guard';
// import { ApiBearerAuth } from '@nestjs/swagger';
// @ApiBearerAuth('bearerAuth')
// @UseGuards(JwtGuard)
// @Controller('api/v1/projects')
// export class ProjectsController {
//     constructor(private service: ProjectsService) {}
//
//     @UseGuards(JwtGuard)
//     @Post()
//     create(@Body() dto: CreateProjectDto, @Req() req:any) {
//         return this.service.create(dto, req.user.userId);
//     }
//
//     @UseGuards(JwtGuard)
//     @Get()
//     listOpen(@Query() q:{page?:string; limit?:string; city?:string; categoryId?:string}) {
//         return this.service.listOpen(q);
//     }
//
//     @UseGuards(JwtGuard)
//     @Get(':id')
//     get(@Param('id') id:string) { return this.service.get(id); }
//
//     @Get(':projectId/attachments')
//     listAttachments(@Param('projectId') projectId: string) {
//         return this.service.listAttachments(projectId);
//     }
//
//     @UseGuards(ProjectOwnerGuard)
//     @Post(':projectId/attachments')
//     addAttachment(
//       @Param('projectId') projectId: string,
//       @Body() body: { objectKey: string; url: string; mime: string; width?: number; height?: number; sizeBytes?: number; caption?: string; isCover?: boolean }
//     ) {
//         return this.service.addAttachment(projectId, body);
//     }
//
//     @UseGuards(ProjectOwnerGuard)
//     @Patch(':projectId/attachments/:attachmentId')
//     updateAttachment(
//       @Param('projectId') projectId: string,
//       @Param('attachmentId') attachmentId: string,
//       @Body() body: { caption?: string; isCover?: boolean }
//     ) {
//         return this.service.updateAttachment(projectId, attachmentId, body);
//     }
//
//     @UseGuards(ProjectOwnerGuard)
//     @Patch(':projectId/attachments/order')
//     reorder(
//       @Param('projectId') projectId: string,
//       @Body() body: { items: { id: string; sortOrder: number }[] }
//     ) {
//         return this.service.reorderAttachments(projectId, body.items);
//     }
//
//     @UseGuards(ProjectOwnerGuard)
//     @Delete(':projectId/attachments/:attachmentId')
//     removeAttachment(
//       @Param('projectId') projectId: string,
//       @Param('attachmentId') attachmentId: string
//     ) {
//         return this.service.removeAttachment(projectId, attachmentId);
//     }
// }