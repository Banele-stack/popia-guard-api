import { IsString, MinLength } from 'class-validator';

/**
 * The file itself arrives as multipart form data, not JSON — this DTO only
 * validates the text fields that ride alongside it in the same multipart
 * request (see operators.controller.ts).
 */
export class CreateOperatorAgreementDto {
  @IsString()
  @MinLength(2)
  type: string;

  @IsString()
  signedDate: string;

  @IsString()
  reviewDate: string;

  @IsString()
  @MinLength(1)
  referenceNumber: string;
}
