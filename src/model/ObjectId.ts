import { ObjectId } from 'mongodb';
import { z } from 'zod';

export const ObjectIdSchema = z.string()
  .refine(str => /^[a-f\d]{24}$/i.test(str), "id must be a 24 character long hexadecimal string.")
  .transform(str => new ObjectId(str));