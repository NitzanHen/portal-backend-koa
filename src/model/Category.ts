import { z } from 'zod';
import { ObjectIdSchema } from './ObjectId.js';

export const CategorySchema = z.object({
  name: z.string()
});

export interface Category extends z.infer<typeof CategorySchema> {}

export const CategoryWithIdSchema = CategorySchema.extend({
  _id: ObjectIdSchema
});

export interface CategoryWithId extends z.infer<typeof CategoryWithIdSchema> {}