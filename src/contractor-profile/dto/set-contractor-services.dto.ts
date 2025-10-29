import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, ArrayUnique, IsArray, ValidateNested } from 'class-validator';
import { ContractorServiceInput } from './contractor-service-input.dto';

export class SetContractorServicesDto {
  @ApiProperty({
    type: [ContractorServiceInput],
    description: 'Полный список услуг исполнителя (заменит текущие)',
    example: [
      { serviceId: 'svc_123', categoryIds: ['cat_a', 'cat_b'] },
      { serviceId: 'svc_456' } // если не указать categoryIds — возьмутся все категории услуги
    ]
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((a: ContractorServiceInput) => a.serviceId) // запрет на дубликаты сервисов
  @ValidateNested({ each: true })
  @Type(() => ContractorServiceInput)
  services!: ContractorServiceInput[];
}
