import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateProjectDto, PremisesType } from './create-project.dto';

async function validateDto(plain: object) {
  return validate(plainToInstance(CreateProjectDto, plain));
}

const validBase = {
  title: 'Ремонт кухни',
  description: 'Полный ремонт кухни 15 кв.м',
  clientId: 'user-abc-123',
};

describe('CreateProjectDto', () => {
  describe('обязательные поля', () => {
    it('принимает минимально корректные данные', async () => {
      const errors = await validateDto(validBase);
      expect(errors).toHaveLength(0);
    });

    it('отклоняет пустой title', async () => {
      const errors = await validateDto({ ...validBase, title: '' });
      expect(errors.some(e => e.property === 'title')).toBe(true);
    });

    it('отклоняет title не строкой', async () => {
      const errors = await validateDto({ ...validBase, title: 123 });
      expect(errors.some(e => e.property === 'title')).toBe(true);
    });

    it('отклоняет отсутствующий title', async () => {
      const { title, ...rest } = validBase;
      const errors = await validateDto(rest);
      expect(errors.some(e => e.property === 'title')).toBe(true);
    });

    it('отклоняет пустой description', async () => {
      const errors = await validateDto({ ...validBase, description: '' });
      expect(errors.some(e => e.property === 'description')).toBe(true);
    });

    it('отклоняет отсутствующий clientId', async () => {
      const { clientId, ...rest } = validBase;
      const errors = await validateDto(rest);
      expect(errors.some(e => e.property === 'clientId')).toBe(true);
    });

    it('отклоняет пустой clientId', async () => {
      const errors = await validateDto({ ...validBase, clientId: '' });
      expect(errors.some(e => e.property === 'clientId')).toBe(true);
    });
  });

  describe('необязательные поля', () => {
    it('принимает корректный cityId', async () => {
      const errors = await validateDto({ ...validBase, cityId: 'city-123' });
      expect(errors).toHaveLength(0);
    });

    it('отклоняет cityId не строкой', async () => {
      const errors = await validateDto({ ...validBase, cityId: 42 });
      expect(errors.some(e => e.property === 'cityId')).toBe(true);
    });

    it('принимает корректный propertyType из enum', async () => {
      const errors = await validateDto({ ...validBase, propertyType: PremisesType.APARTMENT });
      expect(errors).toHaveLength(0);
    });

    it('отклоняет propertyType вне enum', async () => {
      const errors = await validateDto({ ...validBase, propertyType: 'VILLA' });
      expect(errors.some(e => e.property === 'propertyType')).toBe(true);
    });

    it('принимает area >= 0', async () => {
      const errors = await validateDto({ ...validBase, area: 50 });
      expect(errors).toHaveLength(0);
    });

    it('отклоняет отрицательную area', async () => {
      const errors = await validateDto({ ...validBase, area: -1 });
      expect(errors.some(e => e.property === 'area')).toBe(true);
    });

    it('преобразует area из строки в число', async () => {
      const dto = plainToInstance(CreateProjectDto, { ...validBase, area: '50' });
      expect(typeof dto.area).toBe('number');
    });

    it('принимает budgetEstimated целым числом >= 0', async () => {
      const errors = await validateDto({ ...validBase, budgetEstimated: 500000 });
      expect(errors).toHaveLength(0);
    });

    it('отклоняет budgetEstimated отрицательным', async () => {
      const errors = await validateDto({ ...validBase, budgetEstimated: -100 });
      expect(errors.some(e => e.property === 'budgetEstimated')).toBe(true);
    });

    it('отклоняет budgetEstimated дробным', async () => {
      const errors = await validateDto({ ...validBase, budgetEstimated: 1000.5 });
      expect(errors.some(e => e.property === 'budgetEstimated')).toBe(true);
    });

    it('принимает корректный список categoryIds', async () => {
      const errors = await validateDto({ ...validBase, categoryIds: ['cat-1', 'cat-2'] });
      expect(errors).toHaveLength(0);
    });

    it('отклоняет дублирующиеся categoryIds (ArrayUnique)', async () => {
      const errors = await validateDto({ ...validBase, categoryIds: ['cat-1', 'cat-1'] });
      expect(errors.some(e => e.property === 'categoryIds')).toBe(true);
    });

    it('отклоняет categoryIds не массивом', async () => {
      const errors = await validateDto({ ...validBase, categoryIds: 'cat-1' });
      expect(errors.some(e => e.property === 'categoryIds')).toBe(true);
    });
  });

  describe('вложенные services', () => {
    it('принимает корректный services', async () => {
      const errors = await validateDto({
        ...validBase,
        services: [{ serviceId: 'svc-1' }],
      });
      expect(errors).toHaveLength(0);
    });

    it('отклоняет services с невалидным вложенным объектом (нет serviceId)', async () => {
      const errors = await validateDto({
        ...validBase,
        services: [{ categoryIds: ['cat-1'] }],
      });
      expect(errors.some(e => e.property === 'services')).toBe(true);
    });
  });
});
