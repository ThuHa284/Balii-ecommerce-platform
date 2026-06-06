import {
   Controller, 
   Get, 
   Patch,
   Body,
   Req,
   UseGuards 
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
  export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('me')
    getMe(@Req() req) {
      return this.usersService.getProfile(req.user.userId);
    }

    @Patch('me')
    updateMe(@Req() req, @Body() dto: UpdateProfileDto) {
      return this.usersService.updateProfile(req.user.userId, dto);
    }

    @Get()
    @UseGuards(new RolesGuard(['ADMIN', 'SUPER_ADMIN']))
    findAll() {
      return this.usersService.findAll();
    }
    @Patch('me/change-password')
      async changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
      return this.usersService.changePassword(req.user.userId, dto);
}
}