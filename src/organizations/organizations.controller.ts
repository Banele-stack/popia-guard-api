import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('me')
  getOwn(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.getOwn(user.organizationId);
  }

  @Roles('admin')
  @Patch('me')
  updateOwn(@Body() dto: UpdateOrganizationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.updateOwn(user.organizationId, dto);
  }

  /** Any authenticated org member can see their own teammates — only inviting/removing is admin-gated. */
  @Get('members')
  listMembers(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.listMembers(user.organizationId);
  }

  @Roles('admin')
  @Post('members')
  inviteMember(@Body() dto: InviteMemberDto, @CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.inviteMember(user.organizationId, dto, user.userId);
  }

  @Roles('admin')
  @Delete('members/:id')
  removeMember(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.removeMember(user.organizationId, id, user.userId);
  }
}
