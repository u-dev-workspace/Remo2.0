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
    role: 'CLIENT' | 'CONTRACTOR' | 'BUSINESS'; name: string; city: string;
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
                City:true,
            },
        });
        if (!user) throw new NotFoundException('User not found');

        // выкидываем пароль
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...safe } = user as any;
        return safe;
    }

    async setName(id: string, name: string) {
        const user = await this.prisma.user.update({
            where: { id },
            data:{
                name: name,
            }
        });
        if (!user) throw new NotFoundException('User not found');

        // выкидываем пароль
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...safe } = user as any;
        return safe;
    }

    async getUnAuthConractorRec(){
        return this.prisma.contractor.findMany({
            take: 4,
            include: {
                city: { select: { nameRu: true, nameKk: true, nameEn: true, } },
                user: { select: { avatarUrl: true, name: true } }

            },
        });
    }

    async getUnAuthProjectRec(){
        return await this.prisma.project.findMany({
            take:4
        })
    }
    // private async issueTokens(userId: string, role: string) {
    //     const access = await this.jwt.signAsync({ sub: userId, role }, { expiresIn: '24h' });
    //     const refresh = await this.jwt.signAsync({ sub: userId, role, typ: 'refresh' }, { expiresIn: '30d' });
    //     return { accessToken: access, refreshToken: refresh };
    // }

    // ======= базовый профиль пользователя для ответов микросервиса =======
    async getUserProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                role: true,
                name: true,
                City: true,
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    // ======= проверка access-токена =======
    async validateAccessToken(accessToken: string) {
        try {
            const payload = await this.jwt.verifyAsync(accessToken); // секрет уже задан в JwtModule
            const user = await this.getUserProfile(payload.sub);

            return {
                isAuthenticated: true,
                user,
            };
        } catch (e) {
            // здесь без проброса исключения — микросервису удобнее иметь флаг
            return {
                isAuthenticated: false,
                user: null,
            };
        }
    }

    // ======= рефреш токена =======
    async refreshTokens(refreshToken: string) {
        let payload: any;
        try {
            payload = await this.jwt.verifyAsync(refreshToken);
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }

        // защита от использования access-токена как refresh
        if (payload.typ !== 'refresh') {
            throw new UnauthorizedException('Invalid token type');
        }

        const user = await this.getUserProfile(payload.sub);

        const tokens = await this.issueTokens(user.id, user.role);

        return {
            isAuthenticated: true,
            user,
            ...tokens, // { accessToken, refreshToken }
        };
    }

    // ======= уже был у тебя =======
    private async issueTokens(userId: string, role: string) {
        const access = await this.jwt.signAsync(
          { sub: userId, role },
          { expiresIn: '24h' },
        );
        const refresh = await this.jwt.signAsync(
          { sub: userId, role, typ: 'refresh' },
          { expiresIn: '30d' },
        );
        return { accessToken: access, refreshToken: refresh };
    }
}
