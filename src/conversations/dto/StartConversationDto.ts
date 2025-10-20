import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class StartConversationDto {
  @ApiPropertyOptional()
  @IsString() projectId: string;
  @ApiPropertyOptional()
  @IsString() contractorId: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() text?: string;
}
