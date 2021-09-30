import { ObjectId } from 'bson';
import { AsyncResult, resultify } from '../common/Result';
import { OptionalId } from '../common/types';
import { Notification } from '../model/Notification';
import { getDbCollection } from '../peripheral/db';
import { MongoService } from './MongoService';

class NotificationService extends MongoService<OptionalId<Notification>> {
  constructor() {
    super(getDbCollection('notifications'));
  }

  findByGroups(groupIds: ObjectId[]): AsyncResult<Notification[]> {
    return resultify(this.collection.find({ groups: { $in: groupIds } }).toArray());
  }
}

export const notificationService = new NotificationService();