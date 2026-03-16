import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  CreateCompanyDto,
  AddCompanyEmployeeDto,
  UpdateCompanyEmployeeRoleDto,
  UpdateCompanyEmployeePositionDto,
} from './create-company.dto';
import { CompanyPurpose, CompanyRole } from '@prisma/client';

async function validateDto<T extends object>(cls: new () => T, plain: object) {
  return validate(plainToInstance(cls, plain));
}

describe('CreateCompanyDto', () => {
  const validBase = {
    name: 'Remo Logistics',
    purpose: CompanyPurpose.LOGISTICS,
  };

  it('принимает корректные данные', async () => {
    const errors = await validateDto(CreateCompanyDto, validBase);
    expect(errors).toHaveLength(0);
  });

  it('принимает данные с описанием', async () => {
    const errors = await validateDto(CreateCompanyDto, {
      ...validBase,
      description: 'Логистическая компания',
    });
    expect(errors).toHaveLength(0);
  });

  it('отклоняет name короче 2 символов', async () => {
    const errors = await validateDto(CreateCompanyDto, { ...validBase, name: 'A' });
    expect(errors.some(e => e.property === 'name')).toBe(true);
  });

  it('отклоняет name длиннее 255 символов', async () => {
    const errors = await validateDto(CreateCompanyDto, { ...validBase, name: 'A'.repeat(256) });
    expect(errors.some(e => e.property === 'name')).toBe(true);
  });

  it('отклоняет отсутствующий name', async () => {
    const { name, ...rest } = validBase;
    const errors = await validateDto(CreateCompanyDto, rest);
    expect(errors.some(e => e.property === 'name')).toBe(true);
  });

  it('отклоняет некорректный purpose', async () => {
    const errors = await validateDto(CreateCompanyDto, { ...validBase, purpose: 'INVALID' });
    expect(errors.some(e => e.property === 'purpose')).toBe(true);
  });

  it('отклоняет отсутствующий purpose', async () => {
    const { purpose, ...rest } = validBase;
    const errors = await validateDto(CreateCompanyDto, rest);
    expect(errors.some(e => e.property === 'purpose')).toBe(true);
  });
});

describe('AddCompanyEmployeeDto', () => {
  const validBase = { email: 'worker@company.kz' };

  it('принимает минимально корректные данные', async () => {
    const errors = await validateDto(AddCompanyEmployeeDto, validBase);
    expect(errors).toHaveLength(0);
  });

  it('принимает полные данные', async () => {
    const errors = await validateDto(AddCompanyEmployeeDto, {
      email: 'worker@company.kz',
      name: 'Иван Иванов',
      role: CompanyRole.EMPLOYEE,
      position: 'Менеджер',
    });
    expect(errors).toHaveLength(0);
  });

  it('отклоняет невалидный email', async () => {
    const errors = await validateDto(AddCompanyEmployeeDto, { email: 'not-an-email' });
    expect(errors.some(e => e.property === 'email')).toBe(true);
  });

  it('отклоняет отсутствующий email', async () => {
    const errors = await validateDto(AddCompanyEmployeeDto, {});
    expect(errors.some(e => e.property === 'email')).toBe(true);
  });

  it('отклоняет name короче 2 символов', async () => {
    const errors = await validateDto(AddCompanyEmployeeDto, { ...validBase, name: 'A' });
    expect(errors.some(e => e.property === 'name')).toBe(true);
  });

  it('отклоняет некорректный role', async () => {
    const errors = await validateDto(AddCompanyEmployeeDto, { ...validBase, role: 'BOSS' });
    expect(errors.some(e => e.property === 'role')).toBe(true);
  });

  it('отклоняет position короче 2 символов', async () => {
    const errors = await validateDto(AddCompanyEmployeeDto, { ...validBase, position: 'A' });
    expect(errors.some(e => e.property === 'position')).toBe(true);
  });
});

describe('UpdateCompanyEmployeeRoleDto', () => {
  it('принимает корректный role', async () => {
    const errors = await validateDto(UpdateCompanyEmployeeRoleDto, { role: CompanyRole.MANAGEMENT });
    expect(errors).toHaveLength(0);
  });

  it('отклоняет невалидный role', async () => {
    const errors = await validateDto(UpdateCompanyEmployeeRoleDto, { role: 'SUPERADMIN' });
    expect(errors.some(e => e.property === 'role')).toBe(true);
  });

  it('отклоняет отсутствующий role', async () => {
    const errors = await validateDto(UpdateCompanyEmployeeRoleDto, {});
    expect(errors.some(e => e.property === 'role')).toBe(true);
  });
});

describe('UpdateCompanyEmployeePositionDto', () => {
  it('принимает корректную position', async () => {
    const errors = await validateDto(UpdateCompanyEmployeePositionDto, { position: 'Руководитель' });
    expect(errors).toHaveLength(0);
  });

  it('отклоняет position короче 2 символов', async () => {
    const errors = await validateDto(UpdateCompanyEmployeePositionDto, { position: 'A' });
    expect(errors.some(e => e.property === 'position')).toBe(true);
  });

  it('отклоняет position длиннее 255 символов', async () => {
    const errors = await validateDto(UpdateCompanyEmployeePositionDto, { position: 'A'.repeat(256) });
    expect(errors.some(e => e.property === 'position')).toBe(true);
  });

  it('отклоняет отсутствующую position', async () => {
    const errors = await validateDto(UpdateCompanyEmployeePositionDto, {});
    expect(errors.some(e => e.property === 'position')).toBe(true);
  });
});
