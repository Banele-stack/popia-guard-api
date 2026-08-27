import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { User } from '../auth/entities/user.entity';
import { Organization } from './entities/organization.entity';
import { EmailService } from '../email/email.service';

type MockRepo<T> = { [K in keyof T]?: jest.Mock } & Record<string, jest.Mock>;

function mockRepo(): MockRepo<any> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn((entity) => Promise.resolve({ id: 'generated-id', ...entity })),
    create: jest.fn((entity) => entity),
    count: jest.fn(),
    remove: jest.fn(),
  };
}

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let usersRepo: MockRepo<User>;
  let orgsRepo: MockRepo<Organization>;
  let emailService: { send: jest.Mock };

  beforeEach(async () => {
    usersRepo = mockRepo();
    orgsRepo = mockRepo();
    emailService = { send: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(Organization), useValue: orgsRepo },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get(OrganizationsService);
  });

  describe('listMembers', () => {
    it("scopes to the caller's own organization", async () => {
      usersRepo.find.mockResolvedValue([
        { id: 'u1', name: 'Jane', email: 'jane@example.com', role: 'admin', status: 'active', createdAt: new Date() },
      ]);

      const result = await service.listMembers('org-1');

      expect(usersRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: 'org-1' } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('jane@example.com');
    });
  });

  describe('inviteMember', () => {
    it('rejects an email that already has an account', async () => {
      usersRepo.findOne.mockResolvedValue({ id: 'existing-user' });

      await expect(
        service.inviteMember('org-1', { name: 'New Person', email: 'taken@example.com' }, 'admin-1'),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(emailService.send).not.toHaveBeenCalled();
    });

    it('creates an invited member with an unusable password and emails an accept-invite link', async () => {
      usersRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'admin-1', name: 'Jane Doe' });
      orgsRepo.findOne.mockResolvedValue({ id: 'org-1', name: 'Sizwe Data Protection Consultants' });

      const result = await service.inviteMember(
        'org-1',
        { name: 'New Person', email: 'New.Person@Example.com' },
        'admin-1',
      );

      expect(result.status).toBe('invited');
      expect(result.role).toBe('member');

      const saved = usersRepo.save.mock.calls[0][0];
      expect(saved.email).toBe('new.person@example.com');
      expect(saved.status).toBe('invited');
      expect(saved.organizationId).toBe('org-1');
      expect(saved.resetTokenHash).toBeDefined();

      expect(emailService.send).toHaveBeenCalledTimes(1);
      const emailedHtml = emailService.send.mock.calls[0][0].html as string;
      expect(emailedHtml).toContain('Sizwe Data Protection Consultants');
      const tokenMatch = emailedHtml.match(/token=([a-f0-9]+)/);
      expect(tokenMatch).not.toBeNull();
      expect(tokenMatch![1]).not.toBe(saved.resetTokenHash);
    });

    it('honors an explicit admin role instead of defaulting to member', async () => {
      usersRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'admin-1', name: 'Jane' });
      orgsRepo.findOne.mockResolvedValue({ id: 'org-1', name: 'Sizwe Data Protection Consultants' });

      await service.inviteMember('org-1', { name: 'New Admin', email: 'admin2@example.com', role: 'admin' }, 'admin-1');

      const saved = usersRepo.save.mock.calls[0][0];
      expect(saved.role).toBe('admin');
    });
  });

  describe('removeMember', () => {
    it('404s rather than confirming a member id exists in a different org', async () => {
      usersRepo.findOne.mockResolvedValue(null);

      await expect(service.removeMember('org-1', 'someone-elses-id', 'admin-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('refuses to let an admin remove themselves', async () => {
      usersRepo.findOne.mockResolvedValue({ id: 'admin-1', organizationId: 'org-1', role: 'admin' });

      await expect(service.removeMember('org-1', 'admin-1', 'admin-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(usersRepo.remove).not.toHaveBeenCalled();
    });

    it('refuses to remove the last remaining admin', async () => {
      usersRepo.findOne.mockResolvedValue({ id: 'admin-2', organizationId: 'org-1', role: 'admin' });
      usersRepo.count.mockResolvedValue(1);

      await expect(service.removeMember('org-1', 'admin-2', 'admin-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(usersRepo.remove).not.toHaveBeenCalled();
    });

    it('removes a member when none of the guard conditions apply', async () => {
      const member = { id: 'member-1', organizationId: 'org-1', role: 'member' };
      usersRepo.findOne.mockResolvedValue(member);

      const result = await service.removeMember('org-1', 'member-1', 'admin-1');

      expect(usersRepo.remove).toHaveBeenCalledWith(member);
      expect(result.message).toMatch(/removed/i);
    });

    it('allows removing an admin when another admin remains', async () => {
      const member = { id: 'admin-2', organizationId: 'org-1', role: 'admin' };
      usersRepo.findOne.mockResolvedValue(member);
      usersRepo.count.mockResolvedValue(2);

      await service.removeMember('org-1', 'admin-2', 'admin-1');

      expect(usersRepo.remove).toHaveBeenCalledWith(member);
    });
  });
});
