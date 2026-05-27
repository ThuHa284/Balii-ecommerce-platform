import { Injectable } from '@nestjs/common';

@Injectable()
export class VirtualTryonServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
