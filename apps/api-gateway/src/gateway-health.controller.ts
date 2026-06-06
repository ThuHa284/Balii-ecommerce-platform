import { Controller, Get } from '@nestjs/common';
import { GatewayHealthService } from './gateway-health.service';

@Controller('health')
export class GatewayHealthController {
  constructor(private readonly gatewayHealthService: GatewayHealthService) {}

  @Get()
  getHealth() {
    return this.gatewayHealthService.getLiveness();
  }

  @Get('live')
  getLiveness() {
    return this.gatewayHealthService.getLiveness();
  }

  @Get('ready')
  getReadiness() {
    return this.gatewayHealthService.getReadiness();
  }
}
