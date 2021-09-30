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
    const { notification } = ctx.state;

    const result = await notificationService.insert(notification);
    if (!result.ok) {
      throw result.err;
    }

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

    ctx.body = ok(result.data);
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

    ctx.body = ok(result.data);
  })
);

export default router;