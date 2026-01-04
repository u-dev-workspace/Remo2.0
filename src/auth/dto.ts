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

export const ValidateTokenSchema = z.object({
    accessToken: z.string().min(10),
});
export class ValidateTokenDto extends createZodDto(ValidateTokenSchema) {}

export const RefreshTokenSchema = z.object({
    refreshToken: z.string().min(10),
});
export class RefreshTokenDto extends createZodDto(RefreshTokenSchema) {}


export const NameSchema = z.object({
        name: z.string(),
    })


export class NameDto extends createZodDto(NameSchema) {}