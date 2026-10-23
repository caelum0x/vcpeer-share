import { IsInt, IsOptional, IsString, Length, Min } from "class-validator";

export class CreateApiKeyDTO {
  @IsString()
  @Length(1, 50)
  name: string;

  // Omitted or 0 means the key never expires.
  @IsOptional()
  @IsInt()
  @Min(0)
  expiresInDays?: number;
}
