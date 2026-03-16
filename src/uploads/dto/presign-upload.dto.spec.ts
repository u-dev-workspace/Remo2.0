import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PresignUploadDto } from './presign-upload.dto';

async function validateDto(plain: object) {
  return validate(plainToInstance(PresignUploadDto, plain));
}

describe('PresignUploadDto', () => {
  it('принимает корректные данные', async () => {
    const errors = await validateDto({
      projectId: 'clz123abc',
      mime: 'image/jpeg',
      sizeBytes: 1048576,
    });
    expect(errors).toHaveLength(0);
  });

  it('принимает корректные данные с необязательным ext', async () => {
    const errors = await validateDto({
      projectId: 'clz123abc',
      mime: 'image/png',
      sizeBytes: 512000,
      ext: 'png',
    });
    expect(errors).toHaveLength(0);
  });

  it('отклоняет пустой projectId', async () => {
    const errors = await validateDto({
      projectId: '',
      mime: 'image/jpeg',
      sizeBytes: 100,
    });
    expect(errors.some(e => e.property === 'projectId')).toBe(true);
  });

  it('отклоняет projectId не строкой', async () => {
    const errors = await validateDto({
      projectId: 123,
      mime: 'image/jpeg',
      sizeBytes: 100,
    });
    expect(errors.some(e => e.property === 'projectId')).toBe(true);
  });

  it('отклоняет mime не строкой', async () => {
    const errors = await validateDto({
      projectId: 'clz123abc',
      mime: 42,
      sizeBytes: 100,
    });
    expect(errors.some(e => e.property === 'mime')).toBe(true);
  });

  it('отклоняет sizeBytes = 0 (Min 1)', async () => {
    const errors = await validateDto({
      projectId: 'clz123abc',
      mime: 'image/jpeg',
      sizeBytes: 0,
    });
    expect(errors.some(e => e.property === 'sizeBytes')).toBe(true);
  });

  it('отклоняет дробный sizeBytes (не целое)', async () => {
    const errors = await validateDto({
      projectId: 'clz123abc',
      mime: 'image/jpeg',
      sizeBytes: 1.5,
    });
    expect(errors.some(e => e.property === 'sizeBytes')).toBe(true);
  });

  it('отклоняет отрицательный sizeBytes', async () => {
    const errors = await validateDto({
      projectId: 'clz123abc',
      mime: 'image/jpeg',
      sizeBytes: -100,
    });
    expect(errors.some(e => e.property === 'sizeBytes')).toBe(true);
  });

  it('ext не передан — ошибок нет (поле необязательное)', async () => {
    const errors = await validateDto({
      projectId: 'clz123abc',
      mime: 'image/jpeg',
      sizeBytes: 1000,
      ext: undefined,
    });
    expect(errors).toHaveLength(0);
  });

  it('отклоняет ext не строкой', async () => {
    const errors = await validateDto({
      projectId: 'clz123abc',
      mime: 'image/jpeg',
      sizeBytes: 1000,
      ext: 123,
    });
    expect(errors.some(e => e.property === 'ext')).toBe(true);
  });

  it('отклоняет отсутствующий projectId', async () => {
    const errors = await validateDto({
      mime: 'image/jpeg',
      sizeBytes: 100,
    });
    expect(errors.some(e => e.property === 'projectId')).toBe(true);
  });

  it('отклоняет отсутствующий mime', async () => {
    const errors = await validateDto({
      projectId: 'clz123abc',
      sizeBytes: 100,
    });
    expect(errors.some(e => e.property === 'mime')).toBe(true);
  });

  it('отклоняет отсутствующий sizeBytes', async () => {
    const errors = await validateDto({
      projectId: 'clz123abc',
      mime: 'image/jpeg',
    });
    expect(errors.some(e => e.property === 'sizeBytes')).toBe(true);
  });
});
