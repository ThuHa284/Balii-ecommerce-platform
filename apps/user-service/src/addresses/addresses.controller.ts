import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CurrentUser } from '@app/common';

@Controller('users/me/addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {
    console.log('AddressesController loaded');
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.addressesService.findAll(user.id);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateAddressDto) {
    console.log('===== CONTROLLER CREATE ADDRESS =====');
    console.log('CURRENT USER:', user);
    console.log('BODY:', dto);
    console.log('=====================================');

    return this.addressesService.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.addressesService.remove(user.id, id);
  }

  @Patch(':id/default')
  setDefault(@CurrentUser() user: any, @Param('id') id: string) {
    return this.addressesService.setDefault(user.id, id);
  }
}
