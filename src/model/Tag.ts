import { z } from 'zod';
import { ObjectIdSchema } from './ObjectId.js';

export const TagSchema = z.object({
  name: z.string()
});

export interface Tag extends z.infer<typeof TagSchema> {}

export const TagWithIdSchema = TagSchema.extend({
  _id: ObjectIdSchema
});

export interface TagWithId extends z.infer<typeof TagWithIdSchema> {}