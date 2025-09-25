import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['CLIENT','CONTRACTOR']).default('CLIENT'),
    name: z.string().min(2),
    city: z.string().min(2),
});
export class RegisterDto extends createZodDto(RegisterSchema) {}

export const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});
export class LoginDto extends createZodDto(LoginSchema) {}
