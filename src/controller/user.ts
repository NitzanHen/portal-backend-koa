import Router from '@koa/router';
import { err, ok } from '../common/Result.js';
import { db } from '../peripheral/db.js';
import { middlewareGuard } from '../middleware/middlewareGuard.js';
import { ObjectIdSchema } from '../model/ObjectId.js';
import { UserSchema, UserWithIdSchema } from '../model/User.js';

const userCollection = db.collection('users');

const router = new Router({
  prefix: '/user'
});

router.get('/', middlewareGuard(async ctx => {
  const users = await userCollection.find({}).toArray();
  ctx.body = ok(users);
}));

router.get('/:_id',
  middlewareGuard(async (ctx, next) => {
    // Validate id
    const { _id } = ctx.params
    const result = ObjectIdSchema.safeParse(_id);
    if (!result.success) {
      ctx.status = 400;
      ctx.body = err(result.error)
      return;
    }

    ctx.params._id = result.data;
    await next()
  }),
  middlewareGuard(async ctx => {
    const { _id } = ctx.params;

    const user = await userCollection.findOne({ _id });
    if (!user) {
      ctx.status = 400;
      ctx.body = err('No user exists with the given id')
      return;
    }

    ctx.body = ok(user)
  })
);

router.post('/',
  middlewareGuard(async (ctx, next) => {
    // Validate request body
    const result = UserSchema.safeParse(ctx.request.body);
    if (!result.success) {
      ctx.status = 400;
      ctx.body = err(result.error)
      return;
    }

    ctx.request.body = result.data;
    await next()
  }),
  middlewareGuard(async ctx => {
    const user = ctx.request.body;

    const response = await userCollection.insertOne(user);

    ctx.body = ok({ _id: response.insertedId, ...user })
  }));

const PartialUserWithIdSchema = UserWithIdSchema.partial()

router.patch('/',
  middlewareGuard(async (ctx, next) => {
    // Validate request body
    const result = PartialUserWithIdSchema.safeParse(ctx.request.body);
    if (!result.success) {
      ctx.status = 400;
      ctx.body = err(result.error)
      return;
    }

    ctx.request.body = result.data;
    await next()
  }),
  middlewareGuard(async ctx => {
    const user = ctx.request.body;

    const response = await userCollection.findOneAndUpdate(
      { _id: user._id },
      { $set: user},
      { returnDocument: 'after' }
    );
    if (!response.ok) {
      throw new Error('unknown error occured when attempting to update the user');
    }
    else if (!response.value) {
      ctx.status = 400;
      ctx.body = err("No user exists with the given id")
    }

    ctx.body = ok(response.value)
  }));

router.delete('/',
  middlewareGuard(async (ctx, next) => {
    const { _id } = ctx.request.body;

    const result = ObjectIdSchema.safeParse(_id);
    if (!result.success) {
      ctx.status = 400;
      ctx.body = err(result.error)
      return;
    }

    ctx.request.body._id = result.data;
    await next();
  }),
  middlewareGuard(async ctx => {
    const { _id } = ctx.request.body;

    const response = await userCollection.findOneAndDelete({ _id });
    if (!response.ok) {
      throw new Error('unknown error occured when attempting to delete the user');
    }
    else if(!response.value) {
      ctx.status = 400;
      ctx.body = err("No user exists with the given id");
      return;
    }

    ctx.body = ok(response.value)
  }),
);

// router.post('/:id/favourite', ctx => {})

export default router;