import Router from '@koa/router';
import { err, ok } from '../common/Result.js';
import { middlewareGuard } from '../middleware/middlewareGuard.js';
import { validate } from '../middleware/validate.js';
import { CategorySchema, CategoryWithIdSchema } from '../model/Category.js';
import { ObjectIdSchema } from '../model/ObjectId.js';
import { db } from '../peripheral/db.js';

const categoryCollection = db.collection('categories');
const userCollection = db.collection('users');

const router = new Router({
  prefix: '/categories'
});

router.get('/',
  validate(ObjectIdSchema.optional(), ['query', 'userId']),
  middlewareGuard(async ctx => {
    const { userId } = ctx.query;

    const user = (userId && (await userCollection.findOne({ _id: userId }))) ?? null

    const filter = user ? { $in: user.categories } : {}
    const categories = await categoryCollection.find(filter).toArray();

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
  validate(CategorySchema, ['request', 'body']),
  middlewareGuard(async ctx => {
    const category = ctx.request.body;

    const response = await categoryCollection.insertOne(category);

    ctx.body = ok({ _id: response.insertedId, ...category });
  })
);

const PartialCategoryWithIdSchema = CategoryWithIdSchema.partial();

router.patch('/',
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