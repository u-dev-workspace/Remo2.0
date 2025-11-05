import { IsString, IsNotEmpty, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({
    description: 'ID исполнителя, по которому оставляется отзыв',
    example: 'cmh9m49ta0000yl7ypqvz5dgb',
  })
  @IsString()
  @IsNotEmpty()
  contractorId: string;

  @ApiProperty({
    description: 'ID проекта, в рамках которого оставляется отзыв',
    example: 'cmheh5wkc001h4234gurl6s9t',
  })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({
    description: 'Оценка работы исполнителя от 1 до 5',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    description: 'Текст отзыва',
    example: 'Исполнитель всё сделал в срок и очень внимательно подошёл к задаче.',
  })
  @IsString()
  @IsNotEmpty()
  text: string;
}
