import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  UserRole,
  ValidateRequest,
} from './interfaces/validate-request.interface.js';

const VALID_ROLES: UserRole[] = ['USER', 'PARTNER', 'PARTNER_EMPLOYEE'];

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
  }

  async verifyToken(token: string): Promise<ValidateRequest> {
    try {
      const payload = await this.jwtService.verifyAsync<ValidateRequest>(
        token,
        {
          secret: this.jwtSecret,
        },
      );

      if (!payload || !payload.userId || !payload.sessionId || !payload.role) {
        throw new UnauthorizedException('Invalid token payload structure');
      }

      if (!VALID_ROLES.includes(payload.role)) {
        throw new UnauthorizedException(`Invalid user role: ${payload.role}`);
      }

      return {
        userId: payload.userId,
        sessionId: payload.sessionId,
        role: payload.role,
      };
    } catch (error: any) {
      throw new UnauthorizedException(
        error?.message || 'Invalid or expired token',
      );
    }
  }
}
