import { z } from 'zod';
import { ObjectIdSchema } from './ObjectId.js';

export const GroupSchema = z.object({
  name: z.string()
});

export interface Group extends z.infer<typeof GroupSchema> {}

export const GroupWithIdSchema = GroupSchema.extend({
  _id: ObjectIdSchema
});

export interface GroupWithId extends z.input<typeof GroupWithIdSchema> {}