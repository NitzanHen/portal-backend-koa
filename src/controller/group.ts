import Router from '@koa/router';
import { ObjectId } from 'bson';
import { z } from 'zod';
import { isNoSuchResourceError } from '../common/NoSuchResourceError.js';
import { err, ok } from '../common/Result.js';
import { adminsOnly } from '../middleware/adminsOnly.js';
import { middlewareGuard } from '../middleware/middlewareGuard.js';
import { validate } from '../middleware/validate.js';
import { Group, GroupSchema, GroupWithIdSchema } from '../model/Group.js';
import { ObjectIdSchema } from '../model/ObjectId.js';
import { groupService } from '../service/GroupService.js';
import { CtxState } from '../types/CtxState.js';

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
    if(!result.ok) {
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
    const { group } = ctx.state;

    const result = await groupService.insert(group);
    if (!result.ok) {
      throw result.err;
    }

    ctx.body = ok(result.data);
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

    ctx.body = ok(result.data);
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

    ctx.body = ok(result.data);
  })
);

export default router;