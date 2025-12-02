import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from '../common/guards/jwt.guard';

import { MessagePattern, Payload } from '@nestjs/microservices';
@ApiBearerAuth('bearerAuth')
@Controller('api/v1/auth')
export class AuthController {
    constructor(private auth: AuthService) {}

    @Post('register')
    register(@Body() dto: RegisterDto) {
        return this.auth.register(dto);
    }

    @Post('login')
    login(@Body() dto: LoginDto) {
        return this.auth.login(dto.email, dto.password);
    }

    @Get('me')
    @ApiOperation({ summary: 'Текущий пользователь (все поля, кроме passwordHash)' })
    @ApiBearerAuth('bearerAuth')
    @UseGuards(JwtGuard)
    @ApiOkResponse({ description: 'Профиль текущего пользователя без passwordHash' })
    async me(@Req() req: any) {
        const userId: string = req.user?.sub ?? req.user?.id;
        return this.auth.getPublicById(userId);
    }

    @Get('me/profile')
    @UseGuards(JwtGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiOkResponse({ description: 'Basic user info' })
    meprof(@Req() req: any) {
        // req.user.id прилетает из JwtStrategy.validate
        return this.auth.getUserProfile(req.user.id);
    }


    @Post('refresh')
    @ApiOperation({ summary: 'Refresh access/refresh tokens' })
    @ApiOkResponse({ description: 'New token pair and user' })
    refresh(@Body() dto: RefreshTokenDto) {
        return this.auth.refreshTokens(dto.refreshToken);
    }

    @MessagePattern({ cmd: 'auth.validate' })
    validateForMs(@Payload() data: { accessToken: string }) {
        return this.auth.validateAccessToken(data.accessToken);
    }


    @MessagePattern({ cmd: 'auth.refresh' })
    refreshForMs(@Payload() data: { refreshToken: string }) {
        return this.auth.refreshTokens(data.refreshToken);
    }

    @Get('contractors')
    UnAuthConractorRec() {
        return this.auth.getUnAuthConractorRec();
    }

    @Get('projects')
    UnAuthProjectRec() {
        return this.auth.getUnAuthProjectRec();
    }





}
