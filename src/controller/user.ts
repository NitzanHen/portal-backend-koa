import Router from '@koa/router';
import { ObjectId } from 'bson';
import { z } from 'zod';
import { err, ok } from '../common/Result';
import { middlewareGuard } from '../middleware/middlewareGuard';
import { ObjectIdSchema } from '../model/ObjectId';
import { UserSchema, UserWithIdSchema } from '../model/User';
import { adminsOnly } from '../middleware/adminsOnly';
import { validate } from '../middleware/validate';
import { CtxState } from '../common/CtxState';
import { userService } from '../service/UserService';
import { isNoSuchResourceError } from '../common/NoSuchResourceError';
import { sendToClients } from '../websocket/wss';
import { Channel } from '../websocket/Channel';

const router = new Router<CtxState>({
  prefix: '/user'
});

router.get(
  '/',
  adminsOnly,
  middlewareGuard(async ctx => {
    const result = await userService.findAll();
    if (!result.ok) {
      throw result.err;
    }
    ctx.body = ok(result.data);
  })
);

router.get('/me',
  middlewareGuard(async ctx => {
    const { user } = ctx.state;

    ctx.body = ok(user);
  })
);

router.get<{ _id: ObjectId }>(
  '/:_id',
  adminsOnly,
  validate(ObjectIdSchema, '_id', ['params', '_id']),
  middlewareGuard(async ctx => {
    const { _id } = ctx.state;
    const result = await userService.findById(_id);

    if (!result.ok) {
      const { err: error } = result;
      if (isNoSuchResourceError(error)) {
        ctx.status = 400;
        ctx.body = err(error.message);
        return;
      }

      throw error;
    }

    ctx.body = ok(result.data);
  })
);

router.post('/',
  adminsOnly,
  validate(UserSchema, 'user', ['request', 'body']),
  middlewareGuard(async ctx => {
    const { user } = ctx.state;

    const result = await userService.insert(user);
    if (!result.ok) {
      throw result.err;
    }

    const createdUser = result.data;

    sendToClients(Channel.NOTIFICATION, { entity: createdUser._id, action: 'created', data: createdUser }, '*');

    ctx.body = ok(createdUser);
  })
);

const PartialUserWithIdSchema = UserWithIdSchema.partial().extend({
  _id: ObjectIdSchema
});
interface PartialUserWithId extends z.infer<typeof PartialUserWithIdSchema> { }

router.patch<{ patch: PartialUserWithId }>(
  '/',
  adminsOnly,
  validate(PartialUserWithIdSchema, 'patch', ['request', 'body']),
  middlewareGuard(async ctx => {
    const { patch } = ctx.state;

    const result = await userService.update(patch._id, patch);
    if (!result.ok) {
      const { err: error } = result;
      if (isNoSuchResourceError(error)) {
        ctx.status = 400;
        ctx.body = err(error.message);
        return;
      }

      throw error;
    }

    const updatedUser = result.data;

    sendToClients(Channel.NOTIFICATION, { entity: updatedUser._id, action: 'updated', data: updatedUser }, '*');

    ctx.body = ok(updatedUser);
  }));

router.delete<{ _id: ObjectId }>(
  '/',
  adminsOnly,
  validate(ObjectIdSchema, '_id', ['request', 'body', '_id']),
  middlewareGuard(async ctx => {
    const { _id } = ctx.state;

    const result = await userService.delete(_id);
    if (!result.ok) {
      const { err: error } = result;
      if (isNoSuchResourceError(error)) {
        ctx.status = 400;
        ctx.body = err(error.message);
        return;
      }

      throw error;
    }

    const deletedUser = result.data;

    sendToClients(Channel.NOTIFICATION, { entity: deletedUser._id, action: 'deleted', data: deletedUser }, '*');

    ctx.body = ok(deletedUser);
  }),
);

router.post<{ appId: ObjectId }>(
  '/favourite',
  validate(ObjectIdSchema, 'appId', ['body', 'appId']),
  middlewareGuard(async ctx => {
    const { appId } = ctx.state;
    const { _id } = ctx.state.user;

    const result = await userService.addFavourite(_id, appId);

    if (!result.ok) {
      const { err: error } = result;
      if (isNoSuchResourceError(error)) {
        ctx.status = 400;
        ctx.body = err(error.message);
        return;
      }

      throw error;
    }

    ctx.body = ok(result.data);
  })
);
router.delete<{ appId: ObjectId }>(
  '/favourite',
  validate(ObjectIdSchema, 'appId', ['body', 'appId']),
  middlewareGuard(async ctx => {
    const { appId } = ctx.state;
    const { _id } = ctx.state.user;

    const result = await userService.removeFavourite(_id, appId);

    if (!result.ok) {
      const { err: error } = result;
      if (isNoSuchResourceError(error)) {
        ctx.status = 400;
        ctx.body = err(error.message);
        return;
      }

      throw error;
    }

    ctx.body = ok(result.data);
  })
);

export default router;