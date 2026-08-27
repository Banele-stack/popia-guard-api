import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: 'admin' | 'member';
  organizationId: string;
}

/**
 * Pulls the authenticated user off the request — populated by JwtStrategy
 * after JwtAuthGuard verifies the token. Every scoped query in the app goes
 * through organizationId sourced from here, never from client-supplied
 * input, so one tenant can't read/write another tenant's data.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
