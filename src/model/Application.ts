import { z } from 'zod';
import { DateStringSchema } from './DateString';
import { ObjectIdSchema } from './ObjectId';

export const ApplicationSchema = z.object({
  title: z.string(),
  description: z.string(),
  url: z.string(),
  creationDate: DateStringSchema,
  tags: z.array(z.string()),
  categories: z.array(z.string()),
  groups: z.array(ObjectIdSchema),
  imageUrl: z.string(),
  responsive: z.boolean()
});

export interface Application extends z.infer<typeof ApplicationSchema> { }

export const NewApplicationSchema = ApplicationSchema.extend({
  tags: z.array(z.string()).default(() => []),
  categories: z.array(z.string()).default(() => []),
  groups: z.array(ObjectIdSchema).default(() => []),
});

export const ApplicationWithIdSchema = ApplicationSchema.extend({
  _id: ObjectIdSchema
});

export interface ApplicationWithId extends z.infer<typeof ApplicationWithIdSchema> { }