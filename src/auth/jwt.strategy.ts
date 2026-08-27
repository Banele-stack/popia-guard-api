import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from './current-user.decorator';

interface JwtPayload {
  sub: string;
  email: string;
  role: 'admin' | 'member';
  organizationId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error(
        'JWT_SECRET is not set. Set it in .env before starting the API — see .env.example.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    if (!payload.sub || !payload.organizationId) {
      throw new UnauthorizedException();
    }
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId,
    };
  }
}
