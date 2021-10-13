import Router from '@koa/router';
import { ObjectId } from 'bson';
import { z } from 'zod';
import { isNoSuchResourceError } from '../common/NoSuchResourceError';
import { err, ok } from '../common/Result';
import { adminsOnly } from '../middleware/adminsOnly';
import { middlewareGuard } from '../middleware/middlewareGuard';
import { validate } from '../middleware/validate';
import { Notification, NotificationSchema, NotificationWithIdSchema } from '../model/Notification';
import { ObjectIdSchema } from '../model/ObjectId';
import { notificationService } from '../service/NotificationService';
import { CtxState } from '../types/CtxState';
import { Channel } from '../websocket/Channel';
import { sendToClients } from '../websocket/wss';

const router = new Router<CtxState>({
  prefix: '/notification'
});

router.get('/',
  middlewareGuard(async ctx => {
    const { user } = ctx.state;

    const notifications = await notificationService.findByGroups(user.groups);

    ctx.body = ok(notifications);
  }));

router.get<{ _id: ObjectId }>(
  '/:_id',
  validate(ObjectIdSchema, '_id', ['params', '_id']),
  middlewareGuard(async ctx => {
    const { _id } = ctx.state;

    const result = await notificationService.findById(_id);
    if (!result.ok) {
      const { err: error } = result;
      if (isNoSuchResourceError(error)) {
        ctx.status = 400;
        ctx.body = err(error.message);
        return;
      }

      // Unexpected error.
      throw error;
    }

    ctx.body = ok(result.data);
  })
);

router.post<{ notification: Notification }>(
  '/',
  adminsOnly,
  validate(NotificationSchema, 'notification', ['request', 'body']),
  middlewareGuard(async ctx => {

    const result = await notificationService.insert(ctx.state.notification);
    if (!result.ok) {
      throw result.err;
    }

    const createdNotification = result.data;

    sendToClients(Channel.NOTIFICATION, { entity: createdNotification._id, action: 'created', data: createdNotification }, createdNotification.groups);

    ctx.body = ok(result.data);
  })
);

const PartialNotificationWithIdSchema = NotificationWithIdSchema.partial().extend({
  _id: ObjectIdSchema
});
interface PartialNotificationWithId extends z.infer<typeof PartialNotificationWithIdSchema> { }

router.patch<{ patch: PartialNotificationWithId }>(
  '/',
  adminsOnly,
  validate(PartialNotificationWithIdSchema, 'patch', ['request', 'body']),
  middlewareGuard(async ctx => {
    const { patch } = ctx.state;

    const result = await notificationService.update(patch._id, patch);

    if (!result.ok) {
      const { err: error } = result;
      if (isNoSuchResourceError(error)) {
        ctx.status = 400;
        ctx.body = err(error.message);
        return;
      }

      // Unexpected error.
      throw error;
    }

    const updatedNotification = result.data;

    sendToClients(Channel.NOTIFICATION, { entity: updatedNotification._id, action: 'updated', data: updatedNotification }, updatedNotification.groups);

    ctx.body = ok(updatedNotification);
  })
);

router.delete<{ _id: ObjectId }>(
  '/',
  adminsOnly,
  validate(ObjectIdSchema, '_id', ['request', 'body', '_id']),
  middlewareGuard(async ctx => {
    const { _id } = ctx.state;

    const result = await notificationService.delete(_id);
    if (!result.ok) {
      const { err: error } = result;
      if (isNoSuchResourceError(error)) {
        ctx.status = 400;
        ctx.body = err(error.message);
        return;
      }

      // Unexpected error.
      throw error;
    }

    const deletedNotification = result.data;

    sendToClients(Channel.NOTIFICATION, { entity: deletedNotification._id, action: 'updated', data: deletedNotification }, deletedNotification.groups);

    ctx.body = ok(deletedNotification);
  })
);

export default router;