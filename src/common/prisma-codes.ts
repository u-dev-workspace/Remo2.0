/**
 * Prisma ORM error codes
 * @see https://www.prisma.io/docs/orm/reference/error-reference#error-codes
 */
export const PrismaCodes = {
  /** Unique constraint violation */
  UNIQUE_VIOLATION: 'P2002',
  /** Foreign key constraint violation */
  FOREIGN_KEY_VIOLATION: 'P2003',
  /** Record not found */
  NOT_FOUND: 'P2025',
  /** Required field missing */
  REQUIRED_FIELD_MISSING: 'P2012',
} as const;
