import Router from '@koa/router';
import { err, ok } from '../common/Result.js';
import { adminsOnly } from '../middleware/adminsOnly.js';
import { middlewareGuard } from '../middleware/middlewareGuard.js';
import { validate } from '../middleware/validate.js';
import { NotificationSchema, NotificationWithIdSchema } from '../model/Notification.js';
import { ObjectIdSchema } from '../model/ObjectId.js';
import { db } from '../peripheral/db.js';

const notificationController = db.collection('notifications')

const router = new Router({
  prefix: '/notification'
});

router.get('/',
  middlewareGuard(async ctx => {
    const { user } = ctx.state

    const notifications = await notificationController.find({ groups: { $in: user.groups } }).toArray();

    ctx.body = ok(notifications);
  }));

router.get('/:_id',
  validate(ObjectIdSchema, ['params', '_id']),
  middlewareGuard(async ctx => {
    const { _id } = ctx.params;

    const notification = await notificationController.findOne({ _id });
    if (!notification) {
      ctx.status = 400;
      ctx.body = err('No notification exists with the given id');
    }

    ctx.body = ok(notification);
  })
);

router.post('/',
  adminsOnly,
  validate(NotificationSchema, ['request', 'body']),
  middlewareGuard(async ctx => {
    const notification = ctx.request.body;

    const response = await notificationController.insertOne(notification);

    ctx.body = ok({ _id: response.insertedId, ...notification });
  })
)

const PartialNotificationWithIdSchema = NotificationWithIdSchema.partial();

router.patch('/',
  adminsOnly,
  validate(PartialNotificationWithIdSchema, ['request', 'body']),
  middlewareGuard(async ctx => {
    const notification = ctx.request.body;

    const response = await notificationController.findOneAndUpdate(
      { _id: notification._id },
      { $set: notification },
      { returnDocument: 'after' }
    );

    if (!response.ok) {
      throw new Error('unknown error occured when attempting to update the notification');
    }
    else if (!response.value) {
      ctx.status = 400;
      ctx.body = err("No notification exists with the given id")
    }

    ctx.body = ok(response.value)
  })
)

router.delete('/',
  adminsOnly,
  validate(ObjectIdSchema, ['request', 'body', '_id']),
  middlewareGuard(async ctx => {
    const { _id } = ctx.request.body

    const response = await notificationController.findOneAndDelete({ _id });
    if (!response.ok) {
      throw new Error('Unknown error occured while attempting to delete a notification');
    }
    else if (!response.value) {
      ctx.status = 400;
      ctx.body = err("No notification exists with the given id");
      return;
    }

    ctx.body = ok(response.value);
  })
)

router.post('/')

export default router;