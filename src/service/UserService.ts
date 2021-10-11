import { ObjectId } from 'bson';
import { NoSuchResourceError } from '../common/NoSuchResourceError';
import { AsyncResult, err, ok, resultify } from '../common/Result';
import { User, UserWithId } from '../model/User';
import { getDbCollection } from '../peripheral/db';
import { MongoService } from './MongoService';

class UserService extends MongoService<User, UserWithId> {
  constructor() {
    super(getDbCollection('users'));
  }

  async findByOID(oid: string): AsyncResult<UserWithId> {
    try {
      const user = await this.collection.findOne({ oid });

      return user ? ok(user as UserWithId) : err(new NoSuchResourceError());
    }
    catch (e) {
      return err(e);
    }
  }

  /** @todo there should probably not be an access point which sends all the data in the collection. */
  findAll(): AsyncResult<UserWithId[]> {
    return resultify(this.collection.find({}).toArray()) as AsyncResult<UserWithId[]>;
  }

  async addFavourite(_id: ObjectId, appId: ObjectId): AsyncResult<UserWithId> {
    try {
      const response = await this.collection.findOneAndUpdate({ _id }, { $addToSet: { favorites: appId } });
      const user = response.value;
      if (!user) {
        return err(new NoSuchResourceError());
      }

      return ok(user as UserWithId);
    }
    catch (e) {
      return err(e);
    }
  }

  async removeFavourite(_id: ObjectId, appId: ObjectId): AsyncResult<UserWithId> {
    try {
      const response = await this.collection.findOneAndUpdate({ _id }, { $pull: { favorites: appId } });
      const user = response.value;
      if (!user) {
        return err(new NoSuchResourceError());
      }

      return ok(user as UserWithId);
    }
    catch (e) {
      return err(e);
    }
  }
}

export const userService = new UserService();