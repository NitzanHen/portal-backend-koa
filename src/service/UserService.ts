import { OptionalId } from '../common/types';
import { User } from '../model/User';
import { getDbCollection } from '../peripheral/db';
import { MongoService } from './MongoService';

class UserService extends MongoService<OptionalId<User>> {
  constructor() {
    super(getDbCollection('users'));
  }
}

export const userService = new UserService();