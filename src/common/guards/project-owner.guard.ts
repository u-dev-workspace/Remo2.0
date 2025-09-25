import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProjectOwnerGuard implements CanActivate {
    constructor(private prisma: PrismaService) {}
    async canActivate(ctx: ExecutionContext) {
        const req = ctx.switchToHttp().getRequest<any>();
        const user = req.user;
        if (!user) throw new ForbiddenException('Unauthorized');

        const projectId = req.params.projectId ?? req.body.projectId ?? req.params.id;
        if (!projectId) throw new ForbiddenException('Project id missing');

        if (user.role === 'ADMIN') return true;

        const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { clientId: true } });
        if (!project) throw new ForbiddenException('Project not found');
        if (project.clientId !== user.userId) throw new ForbiddenException('Not a project owner');
        return true;
    }
}
