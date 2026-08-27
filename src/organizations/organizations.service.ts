import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { User } from '../auth/entities/user.entity';
import { Organization } from './entities/organization.entity';
import { EmailService } from '../email/email.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { generateHashedToken } from '../common/token.util';

// Longer than the 1-hour forgot-password window — an invite isn't a
// security-sensitive "someone may be trying to take over this account right
// now" event, it's "get around to accepting this when you next check your
// email", so it needs more slack.
const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const BCRYPT_ROUNDS = 12;

export interface MemberSummary {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  status: 'active' | 'invited';
  createdAt: Date;
}

function toSummary(user: User): MemberSummary {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  };
}

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Organization) private readonly orgsRepo: Repository<Organization>,
    private readonly emailService: EmailService,
  ) {}

  async getOwn(organizationId: string): Promise<Organization> {
    const org = await this.orgsRepo.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found.');
    return org;
  }

  /** Information Officer + Regulator registration details — POPIA requires
   * every responsible party to have these on file. */
  async updateOwn(organizationId: string, dto: UpdateOrganizationDto): Promise<Organization> {
    const org = await this.getOwn(organizationId);
    Object.assign(org, dto);
    return this.orgsRepo.save(org);
  }

  async listMembers(organizationId: string): Promise<MemberSummary[]> {
    const members = await this.usersRepo.find({
      where: { organizationId },
      order: { createdAt: 'ASC' },
    });
    return members.map(toSummary);
  }

  /**
   * Adds a second (or third, ...) user to the caller's own organization. The
   * new user is created 'invited' with an unusable placeholder password (a
   * random value never given to anyone, so login can't succeed until it's
   * replaced) and a one-time token emailed to them; following that link
   * lands on the same set-password flow forgot-password uses (see
   * AuthService.resetPassword), which is also what flips them to 'active'.
   */
  async inviteMember(organizationId: string, dto: InviteMemberDto, inviterUserId: string): Promise<MemberSummary> {
    const existing = await this.usersRepo.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const [organization, inviter] = await Promise.all([
      this.orgsRepo.findOne({ where: { id: organizationId } }),
      this.usersRepo.findOne({ where: { id: inviterUserId } }),
    ]);
    const organizationName = organization?.name ?? 'your organization';
    const inviterName = inviter?.name ?? 'A teammate';

    const unusablePassword = randomBytes(32).toString('hex');
    const { rawToken, tokenHash, expiresAt } = generateHashedToken(INVITE_TOKEN_TTL_MS);

    const user = await this.usersRepo.save(
      this.usersRepo.create({
        email: dto.email.toLowerCase(),
        name: dto.name,
        role: dto.role ?? 'member',
        organizationId,
        status: 'invited',
        passwordHash: await bcrypt.hash(unusablePassword, BCRYPT_ROUNDS),
        resetTokenHash: tokenHash,
        resetTokenExpiresAt: expiresAt,
      }),
    );

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:4010';
    const acceptUrl = `${frontendUrl}/accept-invite?token=${rawToken}`;

    await this.emailService.send({
      to: user.email,
      subject: `You've been invited to join ${organizationName} on POPIAGuard`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#1e293b">
          <h2>You're invited</h2>
          <p>${inviterName} has invited you to join <strong>${organizationName}</strong> on
          POPIAGuard. Click below to set your password and get started. This link expires in 7 days.</p>
          <p><a href="${acceptUrl}">${acceptUrl}</a></p>
          <p style="color:#64748b;font-size:12px">If you weren't expecting this, you can safely ignore this email.</p>
        </div>
      `,
    });

    return toSummary(user);
  }

  /**
   * Removes a member from the caller's own org. Scoped to organizationId
   * first so an admin can never target a user in a different tenant by
   * guessing an id — a mismatch reads as "not found", not "forbidden".
   */
  async removeMember(organizationId: string, memberId: string, currentUserId: string): Promise<{ message: string }> {
    const member = await this.usersRepo.findOne({ where: { id: memberId, organizationId } });
    if (!member) {
      throw new NotFoundException('No such team member.');
    }
    if (member.id === currentUserId) {
      throw new BadRequestException('You cannot remove yourself.');
    }
    if (member.role === 'admin') {
      const adminCount = await this.usersRepo.count({ where: { organizationId, role: 'admin' } });
      if (adminCount <= 1) {
        throw new BadRequestException('An organization must keep at least one admin.');
      }
    }

    await this.usersRepo.remove(member);
    return { message: 'Team member removed.' };
  }
}
