import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

// At least one letter and one number — enough to rule out "12345678" and
// "password" without demanding symbols/mixed-case.
export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).+$/;
export const PASSWORD_MESSAGE = 'Password must contain at least one letter and one number.';

export class RegisterDto {
  /** Name of the consultancy/organization being created — this becomes the new tenant. */
  @IsString()
  @MinLength(2)
  organizationName: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password: string;
}
