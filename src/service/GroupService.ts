import { ObjectId } from 'bson';
import { AsyncResult, resultify } from '../common/Result';
import { Group, GroupWithId, GroupWithManagementData } from '../model/Group';
import { getDbCollection } from '../peripheral/db';
import { MongoService } from './MongoService';

class GroupService extends MongoService<Group, GroupWithId> {
  constructor() {
    super(getDbCollection('groups'));
  }

  async findByGroups(groups: ObjectId[]) {
    return resultify(this.collection.find({ groups: { $in: groups } }).toArray());
  }

  async getManagementData(): AsyncResult<GroupWithManagementData[]> {
    return resultify<GroupWithManagementData[]>(this.collection.aggregate([{
      $lookup: {
        from: 'applications',
        localField: '_id',
        foreignField: 'groups',
        as: 'applications'
      }
    }, {
      $set: {
        applications: {
          $map: {
            input: '$applications',
            as: 'app',
            in: { _id: '$$app._id', title: '$$app.title' }
          }
        }
      }
    }, {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: 'groups',
        as: 'users'
      }
    }, {
      $set: {
        users: {
          $map: {
            input: '$users',
            as: 'user',
            in: { _id: '$$user._id', displayName: '$$user.displayName' }
          }
        }
      }
    }]).toArray() as any as Promise<GroupWithManagementData[]>
    );
  }
}

export const groupService = new GroupService();