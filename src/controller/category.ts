import Router from '@koa/router';
import { ObjectId } from 'bson';
import { z } from 'zod';
import { isNoSuchResourceError } from '../common/NoSuchResourceError';
import { err, ok } from '../common/Result';
import { adminsOnly } from '../middleware/adminsOnly';
import { middlewareGuard } from '../middleware/middlewareGuard';
import { validate } from '../middleware/validate';
import { Category, CategorySchema, CategoryWithIdSchema } from '../model/Category';
import { ObjectIdSchema } from '../model/ObjectId';
import { categoryService } from '../service/CategoryService';
import { CtxState } from '../common/CtxState';
import { Channel } from '../websocket/Channel';
import { sendToClients } from '../websocket/wss';

const router = new Router<CtxState>({
  prefix: '/category'
});

router.get('/',
  middlewareGuard(async ctx => {
    const categories = await categoryService.findAll();

    ctx.body = ok(categories);
  })
);

router.get<{ _id: ObjectId }>(
  '/:_id',
  validate(ObjectIdSchema, '_id', ['params', 'id']),
  middlewareGuard(async ctx => {
    const { _id } = ctx.state;

    const result = await categoryService.findById(_id);
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

router.post<{ category: Category }>(
  '/',
  adminsOnly,
  validate(CategorySchema, 'category', ['request', 'body']),
  middlewareGuard(async ctx => {
    const result = await categoryService.insert(ctx.state.category);
    if (!result.ok) {
      throw result.err;
    }

    const createdCategory = result.data;

    sendToClients(Channel.CATEGORY, { entity: createdCategory._id, action: 'created', data: createdCategory }, '*');

    ctx.body = ok(result.data);
  })
);

const PartialCategoryWithIdSchema = CategoryWithIdSchema.partial().extend({
  _id: ObjectIdSchema
});
interface PartialCategoryWithId extends z.infer<typeof PartialCategoryWithIdSchema> { }

router.patch<{ patch: PartialCategoryWithId }>(
  '/',
  adminsOnly,
  validate(PartialCategoryWithIdSchema, 'patch', ['request', 'body']),
  middlewareGuard(async ctx => {
    const { patch } = ctx.state;

    const result = await categoryService.update(patch._id, patch);

    if (!result.ok) {
      const { err: error } = result;
      if (isNoSuchResourceError(error)) {
        ctx.status = 400;
        ctx.body = err(error.message);
        return;
      }

      throw error;
    }

    const updatedCategory = result.data;

    sendToClients(Channel.CATEGORY, { entity: updatedCategory._id, action: 'updated', data: updatedCategory }, '*');

    ctx.body = ok(result.data);
  })
);

router.delete<{ _id: ObjectId }>('/',
  adminsOnly,
  validate(ObjectIdSchema, '_id', ['request', 'body', '_id']),
  middlewareGuard(async ctx => {
    const { _id } = ctx.body;

    const result = await categoryService.delete(_id);

    if (!result.ok) {
      const { err: error } = result;
      if (isNoSuchResourceError(error)) {
        ctx.status = 400;
        ctx.body = err(error.message);
        return;
      }

      throw error;
    }

    const deletedCategory = result.data;

    sendToClients(Channel.CATEGORY, { entity: deletedCategory._id, action: 'deleted', data: deletedCategory }, '*');

    ctx.body = ok(result.data);
  })
);

export default router;