import { Controller, Get } from '@nestjs/common';
import { VirtualTryonServiceService } from './virtual-tryon-service.service';

@Controller()
export class VirtualTryonServiceController {
  constructor(private readonly virtualTryonServiceService: VirtualTryonServiceService) {}

  @Get()
  getHello(): string {
    return this.virtualTryonServiceService.getHello();
  }
}
