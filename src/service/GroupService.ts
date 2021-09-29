import { ObjectId } from 'bson';
import { OptionalId } from '../common/types';
import { Group } from '../model/Group';
import { getDbCollection } from '../peripheral/db';
import { MongoService } from './MongoService';

class GroupService extends MongoService<OptionalId<Group>> {
  constructor() {
    super(getDbCollection('groups'));
  }

  findByGroups(groups: ObjectId[]) {
    return this.collection.find({ groups: { $in: groups } }).toArray();
  }
}

export const groupService = new GroupService();