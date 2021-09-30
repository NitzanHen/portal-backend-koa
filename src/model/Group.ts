import { z } from 'zod';
import { Application } from './Application.js';
import { ObjectIdSchema } from './ObjectId.js';
import { User } from './User.js';

export const GroupSchema = z.object({
  name: z.string()
});

export interface Group extends z.infer<typeof GroupSchema> {}

export const GroupWithIdSchema = GroupSchema.extend({
  _id: ObjectIdSchema
});

export interface GroupWithId extends z.infer<typeof GroupWithIdSchema> {}

export interface GroupWithManagementData {
  applications: Application[];
  users: User[];
} 