import {
    Injectable,
    ConflictException,
    UnauthorizedException,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';

type RegisterInput = {
    email: string; password: string;
    role: 'CLIENT' | 'CONTRACTOR'; name: string; city: string;
};

@Injectable()
export class AuthService {
    constructor(private prisma: PrismaService, private jwt: JwtService) {}

    async register(data: RegisterInput) {
        try {
            const hash = await argon2.hash(data.password);

            // Всё выполняем в одной транзакции, чтобы не было "битых" пользователей
            const result = await this.prisma.$transaction(async (tx) => {
                const user = await tx.user.create({
                    data: {
                        email: data.email,
                        passwordHash: hash,
                        role: data.role as any, // лучше сделать Enum
                        name: data.name,
                        cityId: data.city,
                    },
                });

                // Если это исполнитель — создаём профиль Contractor
                if (data.role === 'CONTRACTOR') {
                    await tx.contractor.create({
                        data: {
                            userId: user.id,
                            // companyName и about можно не указывать, если в схеме nullable
                        },
                    });
                }

                return user;
            });

            return this.issueTokens(result.id, result.role);
        } catch (e: any) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                throw new ConflictException('Email already in use');
            }
            console.error('REGISTER_ERROR', e);
            throw new InternalServerErrorException('REGISTER_FAILED');
        }
    }


    async login(email: string, password: string) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash || !(await argon2.verify(user.passwordHash, password))) {
            throw new UnauthorizedException('AUTH_INVALID_CREDENTIALS');
        }
        return this.issueTokens(user.id, user.role);
    }

    async getPublicById(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                contractor: true,
                projects: true,           // при желании сузить поля — поменяй на select
                Conversation: true,
                Subscription: true,
            },
        });
        if (!user) throw new NotFoundException('User not found');

        // выкидываем пароль
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...safe } = user as any;
        return safe;
    }

    async getUnAuthConractorRec(){
        return await this.prisma.contractor.findMany({
            take:4
        })
    }

    async getUnAuthProjectRec(){
        return await this.prisma.project.findMany({
            take:4
        })
    }
    private async issueTokens(userId: string, role: string) {
        const access = await this.jwt.signAsync({ sub: userId, role }, { expiresIn: '15m' });
        const refresh = await this.jwt.signAsync({ sub: userId, role, typ: 'refresh' }, { expiresIn: '30d' });
        return { accessToken: access, refreshToken: refresh };
    }
}
