import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ROLES_KEY } from './roles.decorator';
import { Role } from './role.enum';
import { Reflector } from '@nestjs/core';
import { User } from '../user/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    // Check if user is admin
    const user: User = context.switchToHttp().getRequest().user;

    // Check if user is admin
    const isUserAdmin = user.roles.some((role) => role === Role.ADMIN);
    if (isUserAdmin) return true;

    return requiredRoles.some((role) => user.roles.includes(role));
  }
}
