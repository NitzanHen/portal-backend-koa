import { z } from 'zod';

/**
 * Checks the a string represents a valid date, and parses it.
 */
export const DateStringSchema = z.string()
  .refine(str => !isNaN(new Date(str).getTime()), 'The string must represent a valid date')
  .transform(str => new Date(str))