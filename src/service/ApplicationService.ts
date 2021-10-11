import { ObjectId } from 'bson';
import { Application, ApplicationWithId } from '../model/Application';
import { getDbCollection } from '../peripheral/db';
import { MongoService } from './MongoService';

class ApplicationService extends MongoService<Application, ApplicationWithId> {
  constructor() {
    super(getDbCollection('applications'));
  }

  async isTitleAvailable(title: string): Promise<boolean> {
    return !(await this.collection.findOne({ title }, { projection: { _id: 1 } }));
  }

  findByGroups(groupIds: ObjectId[]): Promise<Application[]> {
    return this.collection.aggregate([
      {
        $match: {
          groups: { $in: groupIds }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'categories',
          foreignField: '_id',
          as: 'categories'
        }
      }, {
        $lookup: {
          from: 'tags',
          localField: 'tags',
          foreignField: '_id',
          as: 'tags'
        }
      }, {
        $lookup: {
          from: 'groups',
          localField: 'groups',
          foreignField: '_id',
          as: 'groups'
        }
      }]).toArray();
  }
}

export const appService = new ApplicationService();