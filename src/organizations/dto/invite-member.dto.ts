import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../auth/entities/user.entity';

export class InviteMemberDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  /** Defaults to 'member' — inviting another 'admin' is opt-in, not the default. */
  @IsOptional()
  @IsIn(['admin', 'member'])
  role?: UserRole;
}
