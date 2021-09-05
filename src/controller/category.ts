import Router from '@koa/router';
import { err, ok } from '../common/Result.js';
import { adminsOnly } from '../middleware/adminsOnly.js';
import { middlewareGuard } from '../middleware/middlewareGuard.js';
import { validate } from '../middleware/validate.js';
import { CategorySchema, CategoryWithIdSchema } from '../model/Category.js';
import { ObjectIdSchema } from '../model/ObjectId.js';
import { db } from '../peripheral/db.js';

const categoryCollection = db.collection('categories');

const router = new Router({
  prefix: '/category'
});

router.get('/',
  middlewareGuard(async ctx => {
    const categories = await categoryCollection.find({}).toArray();

    ctx.body = ok(categories);
  })
);

router.get('/:id',
  validate(ObjectIdSchema, ['params', 'id']),
  middlewareGuard(async ctx => {
    const { id } = ctx.params;
    const categories = await categoryCollection.findOne({ _id: id });

    if (!categories) {
      ctx.status = 400;
      ctx.body = err('No category exists with the given id');
      return;
    }
    ctx.body = ok(categories)
  }),
);

router.post('/',
  adminsOnly,
  validate(CategorySchema, ['request', 'body']),
  middlewareGuard(async ctx => {
    const category = ctx.request.body;

    const response = await categoryCollection.insertOne(category);

    ctx.body = ok({ _id: response.insertedId, ...category });
  })
);

const PartialCategoryWithIdSchema = CategoryWithIdSchema.partial();

router.patch('/',
  adminsOnly,
  validate(PartialCategoryWithIdSchema, ['request', 'body']),
  middlewareGuard(async ctx => {
    const category = ctx.body;

    const response = await categoryCollection.findOneAndUpdate(
      { _id: category._id },
      { $set: category },
      { returnDocument: 'after' }
    );

    if (!response.ok) {
      throw new Error('unknown error occured when attempting to update the category');
    }
    else if (!response.value) {
      ctx.status = 400;
      ctx.body = err("No category exists with the given id")
    }

    ctx.body = ok(response.value)
  })
);

router.delete('/',
  adminsOnly,
  validate(ObjectIdSchema, ['request', 'body', '_id']),
  middlewareGuard(async ctx => {
    const { _id } = ctx.body;

    const response = await categoryCollection.findOneAndDelete({ _id });
    if (!response.ok) {
      throw new Error('Unknown error occured while attempting to delete a category');
    }
    else if (!response.value) {
      ctx.status = 400;
      ctx.body = err("No category exists with the given id");
      return;
    }

    ctx.body = ok(response.value);
  })
);

export default router;