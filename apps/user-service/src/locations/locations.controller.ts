import { Controller, Get, Query } from '@nestjs/common';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('provinces')
  findProvinces() {
    return this.locationsService.findProvinces();
  }

  @Get('districts')
  findDistricts(@Query('provinceId') provinceId: string) {
    return this.locationsService.findDistricts(Number(provinceId));
  }

  @Get('wards')
  findWards(@Query('districtId') districtId: string) {
    return this.locationsService.findWards(Number(districtId));
  }
}
