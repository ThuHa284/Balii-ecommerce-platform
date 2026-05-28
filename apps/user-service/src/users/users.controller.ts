import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@Req() req) {
    return this.usersService.getProfile(req.user.userId);
  }

  @Patch('me')
  updateMe(@Req() req, @Body() dto: any) {
    return this.usersService.updateProfile(req.user.userId, dto);
  }

  @Get()
  @UseGuards(new RolesGuard(['ADMIN', 'SUPER_ADMIN']))
  findAll() {
    return this.usersService.findAll();
  }
}