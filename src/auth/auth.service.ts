import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { User } from './entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EmailService } from '../email/email.service';
import { generateHashedToken } from '../common/token.util';

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
// Always the same response whether or not the email exists — an endpoint
// that answers differently for "no such account" vs "email sent" lets
// anyone enumerate which addresses have accounts here.
const FORGOT_PASSWORD_GENERIC_MESSAGE =
  'If an account exists for that email, a reset link has been sent.';

export interface AuthResult {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId: string;
    organizationName: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Organization) private readonly orgsRepo: Repository<Organization>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  private sign(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    });
  }

  /** Registration creates a brand new tenant (Organization) plus its first admin user. */
  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.usersRepo.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const organization = await this.orgsRepo.save(
      this.orgsRepo.create({ name: dto.organizationName }),
    );

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersRepo.save(
      this.usersRepo.create({
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
        role: 'admin',
        organizationId: organization.id,
      }),
    );

    return {
      accessToken: this.sign(user),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: organization.id,
        organizationName: organization.name,
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersRepo.findOne({
      where: { email: dto.email.toLowerCase() },
      relations: { organization: true },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return {
      accessToken: this.sign(user),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
      },
    };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersRepo.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      return { message: FORGOT_PASSWORD_GENERIC_MESSAGE };
    }

    const { rawToken, tokenHash, expiresAt } = generateHashedToken(RESET_TOKEN_TTL_MS);
    user.resetTokenHash = tokenHash;
    user.resetTokenExpiresAt = expiresAt;
    await this.usersRepo.save(user);

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:4010';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    await this.emailService.send({
      to: user.email,
      subject: 'Reset your POPIAGuard password',
      html: `
        <div style="font-family:Arial,sans-serif;color:#1e293b">
          <h2>Reset your password</h2>
          <p>Click the link below to choose a new password. This link expires in 1 hour.</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p style="color:#64748b;font-size:12px">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    return { message: FORGOT_PASSWORD_GENERIC_MESSAGE };
  }

  /**
   * Consumes a one-time token and sets a new password. This is the same
   * endpoint a forgot-password reset and a team-invite acceptance both
   * hit — an invited user's account is created with 'invited' status and no
   * usable password (see OrganizationsService.inviteMember), so setting a
   * real password here is also what activates it. An already-active user
   * resetting their password is unaffected — the status write is a no-op.
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const user = await this.usersRepo.findOne({ where: { resetTokenHash: tokenHash } });

    if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This reset link is invalid or has expired.');
    }

    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    user.resetTokenHash = null;
    user.resetTokenExpiresAt = null;
    user.status = 'active';
    await this.usersRepo.save(user);

    return { message: 'Your password has been reset. You can now log in.' };
  }

  async me(userId: string): Promise<AuthResult['user']> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: { organization: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: user.organization.name,
    };
  }
}
