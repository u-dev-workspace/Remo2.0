import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RespondAlertDto, AlertDecision } from './respond-alert.dto';

async function validateDto(plain: object) {
  return validate(plainToInstance(RespondAlertDto, plain));
}

describe('RespondAlertDto', () => {
  it('принимает ACCEPT', async () => {
    const errors = await validateDto({ decision: AlertDecision.ACCEPT });
    expect(errors).toHaveLength(0);
  });

  it('принимает REJECT', async () => {
    const errors = await validateDto({ decision: AlertDecision.REJECT });
    expect(errors).toHaveLength(0);
  });

  it('отклоняет произвольную строку', async () => {
    const errors = await validateDto({ decision: 'MAYBE' });
    expect(errors.some(e => e.property === 'decision')).toBe(true);
  });

  it('отклоняет пустую строку', async () => {
    const errors = await validateDto({ decision: '' });
    expect(errors.some(e => e.property === 'decision')).toBe(true);
  });

  it('отклоняет числовое значение', async () => {
    const errors = await validateDto({ decision: 1 });
    expect(errors.some(e => e.property === 'decision')).toBe(true);
  });

  it('отклоняет null', async () => {
    const errors = await validateDto({ decision: null });
    expect(errors.some(e => e.property === 'decision')).toBe(true);
  });

  it('отклоняет отсутствующий decision', async () => {
    const errors = await validateDto({});
    expect(errors.some(e => e.property === 'decision')).toBe(true);
  });

  it('отклоняет строку в нижнем регистре (регистрозависимо)', async () => {
    const errors = await validateDto({ decision: 'accept' });
    expect(errors.some(e => e.property === 'decision')).toBe(true);
  });
});
