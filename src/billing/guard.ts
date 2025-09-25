import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContractorReplyGuard implements CanActivate {
    constructor(private prisma: PrismaService) {}
    async canActivate(ctx: ExecutionContext) {
        const req = ctx.switchToHttp().getRequest();
        const userId = req.user?.userId;
        const user = await this.prisma.user.findUnique({ where:{ id: userId } });
        if (!user) throw new ForbiddenException();
        if (user.plan === 'PRO' && user.planUntil && user.planUntil > new Date()) return true;
        // FREE: например, не более 3 диалогов/мес
        const start = new Date(); start.setDate(1);
        const count = await this.prisma.conversation.count({
            where:{ contractorId: userId, project:{ createdAt: { gte: start } } }
        });
        if (count >= 3) throw new ForbiddenException('PAYMENT_REQUIRED');
        return true;
    }
}
