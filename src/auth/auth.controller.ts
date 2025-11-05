import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from '../common/guards/jwt.guard';

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

    @Get('contractors')
    UnAuthConractorRec() {
        return this.auth.getUnAuthConractorRec();
    }

    @Get('projects')
    UnAuthProjectRec() {
        return this.auth.getUnAuthProjectRec();
    }





}
