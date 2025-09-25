import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
export const CreateProjectSchema = z.object({
    title: z.string().min(5).max(120),
    description: z.string().min(20).max(5000),
    categories: z.array(z.string()).min(1).max(5),
    placeType: z.enum(['apartment','office','shop','house','other']),
    areaM2: z.number().int().positive().max(10000).optional(),
    budgetMin: z.number().int().nonnegative().optional(),
    budgetMax: z.number().int().optional(),
    city: z.string().min(2).max(80),
});
export class CreateProjectDto extends createZodDto(CreateProjectSchema) {}
