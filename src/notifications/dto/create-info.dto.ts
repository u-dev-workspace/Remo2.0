import { IsString, IsOptional } from 'class-validator';

export class CreateInfoNotificationDto {
  @IsString()
  userId: string; // если будешь создавать не по JWT, а системно

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  message: string;

  // data можно принимать как any или Record<string, any>
}
