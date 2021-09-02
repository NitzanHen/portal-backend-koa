import { z } from 'zod';
import { DateStringSchema } from './DateString.js';
import { ObjectIdSchema } from './ObjectId.js';

export const ApplicationSchema = z.object({
  title: z.string(),
  description: z.string(),
  url: z.string(),
  creationDate: DateStringSchema,
  tags: z.array(z.string()).default(() => []),
  categories: z.array(z.string()).default(() => []),
  groups: z.array(ObjectIdSchema).default(() => []),
  image: z.string(), //todo
  responsive: z.boolean()
});

export interface Application extends z.infer<typeof ApplicationSchema> { }

export const ApplicationWithIdSchema = ApplicationSchema.extend({
  _id: ObjectIdSchema
});

export interface ApplicationWithId extends z.infer<typeof ApplicationWithIdSchema> { }