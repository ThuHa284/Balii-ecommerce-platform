import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class HeaderRolesGuard implements CanActivate {
  constructor(private readonly roles: string[]) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const rawRole = request.headers['x-user-role'];
    const role = Array.isArray(rawRole) ? rawRole[0] : rawRole;

    if (!role) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!this.roles.includes(String(role).toUpperCase())) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
