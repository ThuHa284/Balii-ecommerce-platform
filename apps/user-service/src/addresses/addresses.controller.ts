import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddressesService } from './addresses.service';

@Controller('users/me/addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private addressesService: AddressesService) {}

  @Get()
  findMyAddresses(@Req() req) {
    return this.addressesService.findByUser(req.user.userId);
  }

  @Post()
  create(@Req() req, @Body() dto: any) {
    return this.addressesService.create(req.user.userId, dto);
  }

  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() dto: any) {
    return this.addressesService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  delete(@Req() req, @Param('id') id: string) {
    return this.addressesService.delete(req.user.userId, id);
  }
}