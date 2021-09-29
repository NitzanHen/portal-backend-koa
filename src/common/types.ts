import { ObjectId } from 'bson';

export type OptionalId<T, Id = ObjectId> = T & { _id?: Id }