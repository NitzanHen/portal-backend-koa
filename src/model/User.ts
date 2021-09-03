import { z } from 'zod';
import { ObjectIdSchema } from './ObjectId.js';

export const UserSchema = z.object({
  oid: ObjectIdSchema,
  firstName: z.string(),
  lastName: z.string(),
  displayName: z.string(),
  email: z.string().email(),
  admin: z.boolean().default(false),
  role: z.ostring(),
  groups: z.array(ObjectIdSchema).default(() => []),
  favorites: z.array(ObjectIdSchema).default(() => []),
})

export interface User extends z.infer<typeof UserSchema> {}

export const UserWithIdSchema = UserSchema.extend({
  _id: ObjectIdSchema
});

export interface UserWithId extends z.infer<typeof UserWithIdSchema> {}