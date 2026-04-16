import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateProjectDto, PremisesType } from './create-project.dto';

async function validateDto(plain: object) {
  return validate(plainToInstance(CreateProjectDto, plain));
}

const validBase = {
  title: 'Ремонт кухни',
  description: 'Полный ремонт кухни 15 кв.м',
};

describe('CreateProjectDto', () => {
  describe('минимальный контракт', () => {
    it('принимает минимально корректные данные', async () => {
      const errors = await validateDto(validBase);
      expect(errors).toHaveLength(0);
    });

    it('принимает пустой title (→ DRAFT)', async () => {
      const errors = await validateDto({ ...validBase, title: '' });
      expect(errors.some(e => e.property === 'title')).toBe(false);
    });

    it('отклоняет title не строкой', async () => {
      const errors = await validateDto({ ...validBase, title: 123 });
      expect(errors.some(e => e.property === 'title')).toBe(true);
    });

    it('принимает отсутствующий title (→ DRAFT)', async () => {
      const { title, ...rest } = validBase;
      const errors = await validateDto(rest);
      expect(errors.some(e => e.property === 'title')).toBe(false);
    });

    it('принимает пустой description', async () => {
      const errors = await validateDto({ ...validBase, description: '' });
      expect(errors.some(e => e.property === 'description')).toBe(false);
    });

    it('принимает полностью пустой объект (→ DRAFT)', async () => {
      const errors = await validateDto({});
      expect(errors).toHaveLength(0);
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

  describe('status', () => {
    it('принимает корректное значение enum (DRAFT)', async () => {
      const errors = await validateDto({ ...validBase, status: 'DRAFT' });
      expect(errors).toHaveLength(0);
    });

    it('принимает корректное значение enum (OPEN)', async () => {
      const errors = await validateDto({ ...validBase, status: 'OPEN' });
      expect(errors).toHaveLength(0);
    });

    it('отклоняет значение вне enum', async () => {
      const errors = await validateDto({ ...validBase, status: 'INVALID' });
      expect(errors.some(e => e.property === 'status')).toBe(true);
    });

    it('принимает отсутствие status (опциональное поле)', async () => {
      const errors = await validateDto({ ...validBase });
      expect(errors.some(e => e.property === 'status')).toBe(false);
    });
  });
});
