import { OptionalId } from '../common/types';
import { getDbCollection } from '../peripheral/db';
import { MongoService } from './MongoService';

class NotificationService extends MongoService<OptionalId<Notification>> {
  constructor() {
    super(getDbCollection('notifications'));
  }
}

export const notificationService = new NotificationService();