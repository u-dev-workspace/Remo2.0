import { IsEnum } from 'class-validator';

export enum AlertDecision {
  ACCEPT = 'ACCEPT',
  REJECT = 'REJECT',
}

export class RespondAlertDto {
  @IsEnum(AlertDecision)
  decision: AlertDecision;
}
