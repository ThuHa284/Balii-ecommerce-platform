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
import { RefreshTokenDto } from './dto/refresh-token.dto';

import { Request } from 'express';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordReset } from '../entities/password-reset.entity';
import { User } from '../entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm/dist/typeorm.module';


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

     @Post('refresh')
        refreshToken(@Body() dto: RefreshTokenDto) {
        console.log('REFRESH API CALLED');
        console.log('BODY:', dto);
         return this.authService.refreshToken(dto.refreshToken);
      } 

      @Post('forgot-password')
        async forgotPassword(
        @Body() dto: ForgotPasswordDto,
        @Req() req,
        ) 
      {
        return this.authService.forgotPassword(
          dto.email,
          req.ip,
          req.headers['user-agent'],
       );
    }
        @Post('reset-password')
            resetPassword(@Body() dto: ResetPasswordDto) {
            return this.authService.resetPassword(dto);
        }
}
imports: [
  TypeOrmModule.forFeature([
    User,
    PasswordReset,
  ]),
]
