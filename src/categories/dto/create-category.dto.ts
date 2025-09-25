import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateCategorySchema = z.object({
    name: z.string().min(2).max(50),
});

export class CreateCategoryDto extends createZodDto(CreateCategorySchema) {}
