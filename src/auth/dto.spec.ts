import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  ValidateTokenSchema,
  NameSchema,
} from './dto';

describe('RegisterSchema (Zod)', () => {
  const valid = {
    email: 'user@example.com',
    password: 'strongpass1',
    name: 'Иван',
    city: 'Алматы',
  };

  it('принимает корректные данные', () => {
    const result = RegisterSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('role по умолчанию CLIENT', () => {
    const result = RegisterSchema.safeParse(valid);
    expect(result.success && result.data.role).toBe('CLIENT');
  });

  it('принимает role = CONTRACTOR', () => {
    const result = RegisterSchema.safeParse({ ...valid, role: 'CONTRACTOR' });
    expect(result.success).toBe(true);
  });

  it('отклоняет невалидный email', () => {
    const result = RegisterSchema.safeParse({ ...valid, email: 'not-email' });
    expect(result.success).toBe(false);
  });

  it('отклоняет password короче 8 символов', () => {
    const result = RegisterSchema.safeParse({ ...valid, password: 'short' });
    expect(result.success).toBe(false);
  });

  it('отклоняет name короче 2 символов', () => {
    const result = RegisterSchema.safeParse({ ...valid, name: 'И' });
    expect(result.success).toBe(false);
  });

  it('отклоняет city короче 2 символов', () => {
    const result = RegisterSchema.safeParse({ ...valid, city: 'А' });
    expect(result.success).toBe(false);
  });

  it('отклоняет невалидный role', () => {
    const result = RegisterSchema.safeParse({ ...valid, role: 'ADMIN' });
    expect(result.success).toBe(false);
  });

  it('отклоняет отсутствующий email', () => {
    const { email, ...rest } = valid;
    const result = RegisterSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe('LoginSchema (Zod)', () => {
  const valid = {
    email: 'user@example.com',
    password: 'strongpass1',
  };

  it('принимает корректные данные', () => {
    const result = LoginSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('отклоняет невалидный email', () => {
    const result = LoginSchema.safeParse({ ...valid, email: 'bad' });
    expect(result.success).toBe(false);
  });

  it('отклоняет password короче 8 символов', () => {
    const result = LoginSchema.safeParse({ ...valid, password: '1234567' });
    expect(result.success).toBe(false);
  });

  it('отклоняет отсутствующий password', () => {
    const result = LoginSchema.safeParse({ email: valid.email });
    expect(result.success).toBe(false);
  });
});

describe('RefreshTokenSchema (Zod)', () => {
  it('принимает токен длиннее 10 символов', () => {
    const result = RefreshTokenSchema.safeParse({ refreshToken: 'a'.repeat(11) });
    expect(result.success).toBe(true);
  });

  it('отклоняет токен короче 10 символов', () => {
    const result = RefreshTokenSchema.safeParse({ refreshToken: 'short' });
    expect(result.success).toBe(false);
  });

  it('отклоняет отсутствующий refreshToken', () => {
    const result = RefreshTokenSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('ValidateTokenSchema (Zod)', () => {
  it('принимает токен длиннее 10 символов', () => {
    const result = ValidateTokenSchema.safeParse({ accessToken: 'a'.repeat(11) });
    expect(result.success).toBe(true);
  });

  it('отклоняет токен короче 10 символов', () => {
    const result = ValidateTokenSchema.safeParse({ accessToken: 'tiny' });
    expect(result.success).toBe(false);
  });
});

describe('NameSchema (Zod)', () => {
  it('принимает корректное имя', () => {
    const result = NameSchema.safeParse({ name: 'Иван' });
    expect(result.success).toBe(true);
  });

  it('отклоняет отсутствующий name', () => {
    const result = NameSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('отклоняет name не строкой', () => {
    const result = NameSchema.safeParse({ name: 123 });
    expect(result.success).toBe(false);
  });
});
