import { Result } from '../common/Result';

export interface Service<T, Id> {
  insert(obj: T): Promise<Result<T>>;
  update(id: Id, patch: Partial<T>): Promise<Result<T>>;
  delete(id: Id): Promise<Result<T>>;
  findById(id: Id): Promise<Result<T>>;
}