import Router from '@koa/router';
import { ObjectId } from 'bson';
import { z } from 'zod';
import { isNoSuchResourceError } from '../common/NoSuchResourceError';
import { err, ok } from '../common/Result';
import { adminsOnly } from '../middleware/adminsOnly';
import { middlewareGuard } from '../middleware/middlewareGuard';
import { validate } from '../middleware/validate';
import { ObjectIdSchema } from '../model/ObjectId';
import { Tag, TagSchema, TagWithIdSchema } from '../model/Tag';
import { tagService } from '../service/TagService';
import { CtxState } from '../types/CtxState';

const router = new Router<CtxState>({
  prefix: '/tag'
});

router.get('/',
  middlewareGuard(async ctx => {
    const result = await tagService.findAll();
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
    const result = await tagService.findById(_id);

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
  }),
);

router.post<{ tag: Tag }>(
  '/',
  adminsOnly,
  validate(TagSchema, 'tag', ['request', 'body']),
  middlewareGuard(async ctx => {
    const { tag } = ctx.state;

    const result = await tagService.insert(tag);
    if (!result.ok) {
      throw result.err;
    }

    ctx.body = ok(result.data);
  })
);

const PartialTagWithIdSchema = TagWithIdSchema.partial().extend({
  _id: ObjectIdSchema
});
interface PartialTagWithId extends z.infer<typeof PartialTagWithIdSchema> { }

router.patch<{ patch: PartialTagWithId }>(
  '/',
  adminsOnly,
  validate(PartialTagWithIdSchema, 'patch', ['request', 'body']),
  middlewareGuard(async ctx => {
    const { patch } = ctx.state;

    const result = await tagService.update(patch._id, patch);
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

    const result = await tagService.delete(_id);
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