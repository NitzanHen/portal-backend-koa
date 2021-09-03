import Router from '@koa/router';
import { err, ok } from '../common/Result.js';
import { adminsOnly } from '../middleware/adminsOnly.js';
import { middlewareGuard } from '../middleware/middlewareGuard.js';
import { validate } from '../middleware/validate.js';
import { ObjectIdSchema } from '../model/ObjectId.js';
import { TagSchema, TagWithIdSchema } from '../model/Tag.js';
import { db } from '../peripheral/db.js';

const tagCollection = db.collection('tags');
const userCollection = db.collection('users');

const router = new Router({
  prefix: '/tag'
});

router.get('/',
  validate(ObjectIdSchema.optional(), ['query', 'userId']),
  middlewareGuard(async ctx => {
    const { userId } = ctx.query;

    const user = (userId && (await userCollection.findOne({ _id: userId }))) ?? null

    const filter = user ? { $in: user.tags } : {}
    const tags = await tagCollection.find(filter).toArray();

    ctx.body = ok(tags);
  })
);

router.get('/:id',
  validate(ObjectIdSchema, ['params', 'id']),
  middlewareGuard(async ctx => {
    const { id } = ctx.params;
    const tag = await tagCollection.findOne({ _id: id });

    if (!tag) {
      ctx.status = 400;
      ctx.body = err('No tag exists with the given id');
      return;
    }
    ctx.body = ok(tag)
  }),
);

router.post('/',
  adminsOnly,
  validate(TagSchema, ['request', 'body']),
  middlewareGuard(async ctx => {
    const tag = ctx.request.body;

    const response = await tagCollection.insertOne(tag);

    ctx.body = ok({ _id: response.insertedId, ...tag });
  })
);

const PartialTagWithIdSchema = TagWithIdSchema.partial();

router.patch('/',
  adminsOnly,
  validate(PartialTagWithIdSchema, ['request', 'body']),
  middlewareGuard(async ctx => {
    const tag = ctx.body;

    const response = await tagCollection.findOneAndUpdate(
      { _id: tag._id },
      { $set: tag },
      { returnDocument: 'after' }
    );

    if (!response.ok) {
      throw new Error('unknown error occured when attempting to update the tag');
    }
    else if (!response.value) {
      ctx.status = 400;
      ctx.body = err("No tag exists with the given id")
    }

    ctx.body = ok(response.value)
  })
);

router.delete('/',
  adminsOnly,
  validate(ObjectIdSchema, ['request', 'body', '_id']),
  middlewareGuard(async ctx => {
    const { _id } = ctx.body;

    const response = await tagCollection.findOneAndDelete({ _id });
    if (!response.ok) {
      throw new Error('Unknown error occured while attempting to delete a tag');
    }
    else if (!response.value) {
      ctx.status = 400;
      ctx.body = err("No tag exists with the given id");
      return;
    }

    ctx.body = ok(response.value);
  })
);

export default router;