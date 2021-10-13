import Router from '@koa/router';
import { ObjectId } from 'bson';
import { z } from 'zod';
import { isNoSuchResourceError } from '../common/NoSuchResourceError';
import { err, ok } from '../common/Result';
import { adminsOnly } from '../middleware/adminsOnly';
import { middlewareGuard } from '../middleware/middlewareGuard';
import { validate } from '../middleware/validate';
import { Group, GroupSchema, GroupWithIdSchema } from '../model/Group';
import { ObjectIdSchema } from '../model/ObjectId';
import { groupService } from '../service/GroupService';
import { CtxState } from '../common/CtxState';
import { Channel } from '../websocket/Channel';
import { sendToClients } from '../websocket/wss';

const router = new Router<CtxState>({
  prefix: '/group'
});

router.get('/',
  middlewareGuard(async ctx => {
    const { user } = ctx.state;

    const groups = await groupService.findByGroups(user.groups);

    ctx.body = ok(groups);
  })
);

router.get('/management',
  adminsOnly,
  middlewareGuard(async ctx => {
    const result = await groupService.getManagementData();
    if (!result.ok) {
      throw result.err;
    }

    ctx.body = ok(result.data);
  })
);

router.get<{ _id: ObjectId }>(
  '/:_id',
  validate(ObjectIdSchema, '_id', ['params', '_id']),
  middlewareGuard(async ctx => {
    const { _id } = ctx.state;
    const result = await groupService.findById(_id);

    if (!result.ok) {
      const { err: error } = result;
      if (isNoSuchResourceError(error)) {
        ctx.status = 400;
        ctx.body = err('No group exists with the given id');
        return;
      }

      throw error;
    }

    ctx.body = ok(result.data);
  }),
);

router.post<{ group: Group }>(
  '/',
  adminsOnly,
  validate(GroupSchema, 'group', ['request', 'body']),
  middlewareGuard(async ctx => {

    const result = await groupService.insert(ctx.state.group);
    if (!result.ok) {
      throw result.err;
    }

    const createdGroup = result.data;

    sendToClients(Channel.GROUP, { entity: createdGroup._id, action: 'created', data: createdGroup }, [createdGroup._id]);

    ctx.body = ok(createdGroup);
  })
);

const PartialGroupWithIdSchema = GroupWithIdSchema.partial().extend({
  _id: ObjectIdSchema
});
interface PartialGroupWithId extends z.infer<typeof PartialGroupWithIdSchema> { }

router.patch<{ patch: PartialGroupWithId }>(
  '/',
  adminsOnly,
  validate(PartialGroupWithIdSchema, 'patch', ['request', 'body']),
  middlewareGuard(async ctx => {
    const { patch } = ctx.state;

    const result = await groupService.update(patch._id, patch);

    if (!result.ok) {
      const { err: error } = result;
      if (isNoSuchResourceError(error)) {
        ctx.status = 400;
        ctx.body = err(error.message);
        return;
      }

      throw error;
    }

    const updatedGroup = result.data;

    sendToClients(Channel.GROUP, { entity: updatedGroup._id, action: 'created', data: updatedGroup }, [updatedGroup._id]);

    ctx.body = ok(updatedGroup);
  })
);

router.delete<{ _id: ObjectId }>(
  '/',
  adminsOnly,
  validate(ObjectIdSchema, '_id', ['request', 'body', '_id']),
  middlewareGuard(async ctx => {
    const { _id } = ctx.state;

    const result = await groupService.delete(_id);

    if (!result.ok) {
      const { err: error } = result;
      if (isNoSuchResourceError(error)) {
        ctx.status = 400;
        ctx.body = err(error.message);
        return;
      }

      throw error;
    }

    const deletedGroup = result.data;

    sendToClients(Channel.GROUP, { entity: deletedGroup._id, action: 'created', data: deletedGroup }, [deletedGroup._id]);

    ctx.body = ok(deletedGroup);
  })
);

export default router;