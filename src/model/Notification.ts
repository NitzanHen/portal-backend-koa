import { z } from 'zod';
import { DateStringSchema } from './DateString';
import { ObjectIdSchema } from './ObjectId';

export const NotificationSchema = z.object({
  title: z.string(),
  description: z.string(),
  poster: ObjectIdSchema,
  applications: z.array(ObjectIdSchema).default(() => []),
  groups: z.array(ObjectIdSchema).default(() => []),
  postDate: DateStringSchema,
  expirationDate: DateStringSchema.optional()
});

export interface Notification extends z.infer<typeof NotificationSchema> {}

export const NotificationWithIdSchema = NotificationSchema.extend({
  _id: ObjectIdSchema
});

export interface NotificationWithId extends z.infer<typeof NotificationWithIdSchema> {}