import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Headers,
  Query,
} from '@nestjs/common';

import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ResendVerificationDto } from './dto/resend-verification.dto';



@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }
  @Get('test')
test() {
  return 'auth ok';
}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  login(@Req() req) {
    return this.authService.login(req.user);
  }

  @Post('refresh')
  refresh(@Body() body: { userId: string; refreshToken: string }) {
    return this.authService.refresh(body.userId, body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Req() req, @Headers('authorization') authorization: string) {
    const token = authorization.replace('Bearer ', '');

    return this.authService.logout(req.user.userId, token);
  }
      @Get('verify-email')
      verifyEmail(@Query('token') token: string) {
      return this.authService.verifyEmail(token);
    }
    @Post('resend-verification')
    resendVerification(@Body() dto: ResendVerificationDto) {
      return this.authService.resendVerificationEmail(dto.email);
    }
}