import { Collection, ObjectId, OptionalId } from 'mongodb';
import { NoSuchResourceError } from '../common/NoSuchResourceError';
import { err, ok } from '../common/Result';
import { Service } from './Service';

export class MongoService<T> implements Service<T, ObjectId> {

  protected collection!: Collection<T>;

  constructor(collection: Collection<T> | Promise<Collection<T>>) {
    if (collection instanceof Promise) {
      collection.then(c => {
        this.collection = c;
      });
    }
    else {
      this.collection = collection;
    }
  }

  /** 
   * This is where collection indexes should be defined.
   * Override this function in a subclass if indexes are needed.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  createIndexes(collection: Collection<T>) { }

  async insert(obj: T) {
    try {
      const response = await this.collection.insertOne(obj as OptionalId<T>);

      return ok({ _id: response.insertedId, ...obj });
    } catch (e) {
      return err(e);
    }
  }

  async delete(_id: ObjectId) {
    try {
      const response = await this.collection.findOneAndDelete({ _id });
      const obj = response.value;


      return obj ? ok(obj) : err(new NoSuchResourceError());
    } catch (e) {
      return err(e);
    }
  }

  async update(_id: ObjectId, patch: Partial<T>) {
    try {
      const response = await this.collection.findOneAndUpdate(
        { _id },
        { $set: patch },
        { returnDocument: 'after' }
      );
      const newObj = response.value;

      return newObj ? ok(newObj) : err(new NoSuchResourceError());
    }
    catch (e) {
      return err(e);
    }
  }

  async findById(_id: ObjectId) {
    try {
      const obj = await this.collection.findOne({ _id });

      return obj ? ok(obj) : err(new NoSuchResourceError());
    }
    catch (e) {
      return err(e);
    }
  }
}