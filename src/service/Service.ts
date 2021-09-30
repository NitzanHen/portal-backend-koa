import { AsyncResult } from '../common/Result';

export interface Service<T, Id> {
  insert(obj: T): AsyncResult<T>;
  update(id: Id, patch: Partial<T>): AsyncResult<T>;
  delete(id: Id): AsyncResult<T>;
  findById(id: Id): AsyncResult<T>;
}