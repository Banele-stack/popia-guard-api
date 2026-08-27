import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getStats(user.organizationId);
  }

  @Get('needs-attention')
  getNeedsAttention(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getNeedsAttentionFeed(user.organizationId);
  }
}
