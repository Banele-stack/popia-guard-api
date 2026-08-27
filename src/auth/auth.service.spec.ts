import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { EmailService } from '../email/email.service';

type MockRepo<T> = { [K in keyof T]?: jest.Mock } & Record<string, jest.Mock>;

function mockRepo(): MockRepo<any> {
  return {
    findOne: jest.fn(),
    save: jest.fn((entity) => Promise.resolve({ id: 'generated-id', ...entity })),
    create: jest.fn((entity) => entity),
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let usersRepo: MockRepo<User>;
  let orgsRepo: MockRepo<Organization>;
  let emailService: { send: jest.Mock };

  beforeEach(async () => {
    usersRepo = mockRepo();
    orgsRepo = mockRepo();
    emailService = { send: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(Organization), useValue: orgsRepo },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('signed.jwt.token') } },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('creates a new organization and its first admin user', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      orgsRepo.save.mockResolvedValue({ id: 'org-1', name: 'Sizwe Data Protection Consultants' });

      const result = await service.register({
        organizationName: 'Sizwe Data Protection Consultants',
        name: 'Jane Doe',
        email: 'Jane@Example.com',
        password: 'Passw0rd1',
      });

      expect(result.user.role).toBe('admin');
      expect(result.user.organizationId).toBe('org-1');
      expect(result.accessToken).toBe('signed.jwt.token');

      const savedUser = usersRepo.save.mock.calls[0][0];
      expect(savedUser.email).toBe('jane@example.com');
      expect(savedUser.passwordHash).not.toBe('Passw0rd1');
      expect(await bcrypt.compare('Passw0rd1', savedUser.passwordHash)).toBe(true);
    });

    it('rejects registration with an email that already exists', async () => {
      usersRepo.findOne.mockResolvedValue({ id: 'existing-user' });

      await expect(
        service.register({
          organizationName: 'Sizwe Data Protection Consultants',
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'Passw0rd1',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(orgsRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('rejects an unknown email without revealing whether the account exists', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      await expect(service.login({ email: 'nobody@example.com', password: 'x' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a wrong password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 12);
      usersRepo.findOne.mockResolvedValue({
        id: 'u1',
        email: 'jane@example.com',
        passwordHash,
        organization: { id: 'org-1', name: 'Sizwe Data Protection Consultants' },
      });

      await expect(
        service.login({ email: 'jane@example.com', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('succeeds with the correct password and returns a token', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 12);
      usersRepo.findOne.mockResolvedValue({
        id: 'u1',
        email: 'jane@example.com',
        role: 'admin',
        name: 'Jane Doe',
        organizationId: 'org-1',
        passwordHash,
        organization: { id: 'org-1', name: 'Sizwe Data Protection Consultants' },
      });

      const result = await service.login({ email: 'jane@example.com', password: 'correct-password' });
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user.organizationId).toBe('org-1');
    });
  });

  describe('forgotPassword / resetPassword', () => {
    it('returns the same generic message whether or not the account exists', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      const result = await service.forgotPassword('nobody@example.com');
      expect(result.message).toMatch(/if an account exists/i);
      expect(emailService.send).not.toHaveBeenCalled();
    });

    it('emails a reset link and stores only a hash of the token, never the raw token', async () => {
      usersRepo.findOne.mockResolvedValue({ id: 'u1', email: 'jane@example.com' });

      await service.forgotPassword('jane@example.com');

      expect(emailService.send).toHaveBeenCalledTimes(1);
      const saved = usersRepo.save.mock.calls[0][0];
      expect(saved.resetTokenHash).toBeDefined();
      expect(saved.resetTokenExpiresAt).toBeInstanceOf(Date);

      const emailedHtml = emailService.send.mock.calls[0][0].html as string;
      const tokenMatch = emailedHtml.match(/token=([a-f0-9]+)/);
      expect(tokenMatch).not.toBeNull();
      expect(tokenMatch![1]).not.toBe(saved.resetTokenHash);
    });

    it('rejects an expired or unknown reset token', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      await expect(service.resetPassword('bad-token', 'NewPassw0rd')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects a token past its expiry even if the hash matches', async () => {
      usersRepo.findOne.mockResolvedValue({
        id: 'u1',
        resetTokenHash: 'whatever',
        resetTokenExpiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.resetPassword('some-token', 'NewPassw0rd')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('updates the password and clears the reset token on success', async () => {
      usersRepo.findOne.mockResolvedValue({
        id: 'u1',
        resetTokenHash: 'whatever',
        resetTokenExpiresAt: new Date(Date.now() + 1000 * 60),
      });

      const result = await service.resetPassword('some-token', 'NewPassw0rd1');
      expect(result.message).toMatch(/password has been reset/i);

      const saved = usersRepo.save.mock.calls[0][0];
      expect(saved.resetTokenHash).toBeNull();
      expect(saved.resetTokenExpiresAt).toBeNull();
      expect(await bcrypt.compare('NewPassw0rd1', saved.passwordHash)).toBe(true);
    });

    it('activates an invited team member the same way it resets a password', async () => {
      usersRepo.findOne.mockResolvedValue({
        id: 'u2',
        status: 'invited',
        resetTokenHash: 'whatever',
        resetTokenExpiresAt: new Date(Date.now() + 1000 * 60),
      });

      await service.resetPassword('invite-token', 'NewPassw0rd1');

      const saved = usersRepo.save.mock.calls[0][0];
      expect(saved.status).toBe('active');
    });
  });
});
