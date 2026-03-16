import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateReviewDto } from './create-review.dto';

async function validateDto(plain: object) {
  return validate(plainToInstance(CreateReviewDto, plain));
}

const validBase = {
  contractorId: 'cmh9m49ta0000yl7ypqvz5dgb',
  projectId: 'cmheh5wkc001h4234gurl6s9t',
  rating: 5,
  text: 'Отличная работа, всё в срок.',
};

describe('CreateReviewDto', () => {
  it('принимает корректные данные', async () => {
    const errors = await validateDto(validBase);
    expect(errors).toHaveLength(0);
  });

  describe('contractorId', () => {
    it('отклоняет пустой contractorId', async () => {
      const errors = await validateDto({ ...validBase, contractorId: '' });
      expect(errors.some(e => e.property === 'contractorId')).toBe(true);
    });

    it('отклоняет contractorId не строкой', async () => {
      const errors = await validateDto({ ...validBase, contractorId: 123 });
      expect(errors.some(e => e.property === 'contractorId')).toBe(true);
    });

    it('отклоняет отсутствующий contractorId', async () => {
      const { contractorId, ...rest } = validBase;
      const errors = await validateDto(rest);
      expect(errors.some(e => e.property === 'contractorId')).toBe(true);
    });
  });

  describe('projectId', () => {
    it('отклоняет пустой projectId', async () => {
      const errors = await validateDto({ ...validBase, projectId: '' });
      expect(errors.some(e => e.property === 'projectId')).toBe(true);
    });

    it('отклоняет отсутствующий projectId', async () => {
      const { projectId, ...rest } = validBase;
      const errors = await validateDto(rest);
      expect(errors.some(e => e.property === 'projectId')).toBe(true);
    });
  });

  describe('rating', () => {
    it('принимает rating = 1 (нижняя граница)', async () => {
      const errors = await validateDto({ ...validBase, rating: 1 });
      expect(errors).toHaveLength(0);
    });

    it('принимает rating = 5 (верхняя граница)', async () => {
      const errors = await validateDto({ ...validBase, rating: 5 });
      expect(errors).toHaveLength(0);
    });

    it('отклоняет rating = 0 (ниже Min)', async () => {
      const errors = await validateDto({ ...validBase, rating: 0 });
      expect(errors.some(e => e.property === 'rating')).toBe(true);
    });

    it('отклоняет rating = 6 (выше Max)', async () => {
      const errors = await validateDto({ ...validBase, rating: 6 });
      expect(errors.some(e => e.property === 'rating')).toBe(true);
    });

    it('отклоняет дробный rating', async () => {
      const errors = await validateDto({ ...validBase, rating: 4.5 });
      expect(errors.some(e => e.property === 'rating')).toBe(true);
    });

    it('отклоняет rating строкой', async () => {
      const errors = await validateDto({ ...validBase, rating: '5' });
      expect(errors.some(e => e.property === 'rating')).toBe(true);
    });

    it('отклоняет отсутствующий rating', async () => {
      const { rating, ...rest } = validBase;
      const errors = await validateDto(rest);
      expect(errors.some(e => e.property === 'rating')).toBe(true);
    });
  });

  describe('text', () => {
    it('отклоняет пустой text', async () => {
      const errors = await validateDto({ ...validBase, text: '' });
      expect(errors.some(e => e.property === 'text')).toBe(true);
    });

    it('отклоняет text не строкой', async () => {
      const errors = await validateDto({ ...validBase, text: 42 });
      expect(errors.some(e => e.property === 'text')).toBe(true);
    });

    it('отклоняет отсутствующий text', async () => {
      const { text, ...rest } = validBase;
      const errors = await validateDto(rest);
      expect(errors.some(e => e.property === 'text')).toBe(true);
    });
  });
});
