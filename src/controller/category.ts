import Router from '@koa/router';
import { ObjectId } from 'bson';
import { z } from 'zod';
import { isNoSuchResourceError } from '../common/NoSuchResourceError.js';
import { err, ok } from '../common/Result.js';
import { adminsOnly } from '../middleware/adminsOnly.js';
import { middlewareGuard } from '../middleware/middlewareGuard.js';
import { validate } from '../middleware/validate.js';
import { Category, CategorySchema, CategoryWithIdSchema } from '../model/Category.js';
import { ObjectIdSchema } from '../model/ObjectId.js';
import { categoryService } from '../service/CategoryService.js';
import { CtxState } from '../types/CtxState.js';

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
    const category = ctx.request.body;

    const result = await categoryService.insert(category);
    if (!result.ok) {
      throw result.err;
    }
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

    ctx.body = ok(result.data);
  })
);

export default router;