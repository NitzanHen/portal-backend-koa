import { ObjectId } from 'bson';

export type SocketId = string;

export type OptionalId<T, Id = ObjectId> = T & { _id?: Id }