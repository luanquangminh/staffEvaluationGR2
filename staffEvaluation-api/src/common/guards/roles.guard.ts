import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request?.user;

    // Default-deny: missing user or missing roles array → reject
    if (!user || !Array.isArray(user.roles)) {
      this.logger.warn(
        `Denied ${request?.method} ${request?.url}: missing user or roles. requiredRoles=${requiredRoles.join(',')}`,
      );
      return false;
    }

    return requiredRoles.some((role) => user.roles.includes(role));
  }
}
