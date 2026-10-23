import { Type } from "class-transformer";
import {
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { i18nValidationMessage } from "nestjs-i18n";
import { ShareSecurityDTO } from "./shareSecurity.dto";

// Allowlist, not a free-form string: this value is set by whatever page
// deep-linked into /upload (e.g. a VCPeer Live post-session screen, a
// Cal.com booking confirmation page) and is persisted as-is on the Share
// row, so it must be constrained to known attribution sources rather than
// accepting arbitrary client-supplied text.
export const SHARE_SOURCE_VALUES = ["live", "booking"] as const;
export type ShareSource = (typeof SHARE_SOURCE_VALUES)[number];

export class CreateShareDTO {
  @IsString()
  @Matches("^[a-zA-Z0-9_-]*$", undefined, {
    message: i18nValidationMessage("validation.idPattern"),
  })
  @Length(3, 50)
  id: string;

  @Length(3, 30)
  @IsOptional()
  name: string;

  @IsString()
  expiration: string;

  @MaxLength(512)
  @IsOptional()
  description: string;

  @IsEmail({}, { each: true })
  recipients: string[];

  @ValidateNested()
  @Type(() => ShareSecurityDTO)
  security: ShareSecurityDTO;

  @IsNumber()
  @IsOptional()
  size: number;

  // Where this share was created from — set by the cross-sell CTA that
  // deep-linked into /upload (?ref=live, ?ref=booking). Null/omitted means
  // direct traffic / an SEO landing page / typed-in URL.
  @IsOptional()
  @IsIn(SHARE_SOURCE_VALUES as readonly string[])
  source?: string;
}
