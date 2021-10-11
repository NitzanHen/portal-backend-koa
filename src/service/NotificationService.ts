import { ObjectId } from 'bson';
import { AsyncResult, resultify } from '../common/Result';
import { Notification, NotificationWithId } from '../model/Notification';
import { getDbCollection } from '../peripheral/db';
import { MongoService } from './MongoService';

class NotificationService extends MongoService<Notification, NotificationWithId> {
  constructor() {
    super(getDbCollection('notifications'));
  }

  findByGroups(groupIds: ObjectId[]): AsyncResult<Notification[]> {
    return resultify(this.collection.find({ groups: { $in: groupIds } }).toArray());
  }
}

export const notificationService = new NotificationService();