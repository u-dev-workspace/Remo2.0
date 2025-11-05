import { IsString, IsOptional } from 'class-validator';

export class CreateAlertNotificationDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  message: string;
}
