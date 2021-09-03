import Router from '@koa/router';
import { err, ok } from '../common/Result.js';
import { adminsOnly } from '../middleware/adminsOnly.js';
import { middlewareGuard } from '../middleware/middlewareGuard.js';
import { validate } from '../middleware/validate.js';
import { ApplicationSchema, ApplicationWithIdSchema } from '../model/Application.js';
import { ObjectIdSchema } from '../model/ObjectId.js';
import { db } from '../peripheral/db.js';

const appCollection = db.collection('applications');

const router = new Router({
  prefix: '/application'
});

router.get('/', middlewareGuard(async ctx => {
  const apps = await appCollection.find({}).toArray();

  ctx.body = ok(apps);
}));

router.get('/:_id',
  validate(ObjectIdSchema, ['params', '_id']),
  middlewareGuard(async ctx => {
    const { _id } = ctx.params;

    const app = await appCollection.findOne({ _id });
    if (!app) {
      ctx.status = 400;
      ctx.body = err('No app exists with the given id');
    }

    ctx.body = ok(app);
  })
);

router.get('/title-available/:title',
  adminsOnly,
  validate(ObjectIdSchema, ['params', 'title']),
  middlewareGuard(async ctx => {
    const { title } = ctx.params;

    const app = await appCollection.findOne({ title }, { projection: { _id: 1 } });

    // If an app with the title is found, return false, else return true.
    return ok(!app)
  })
)

router.post('/',
  adminsOnly,
  validate(ApplicationSchema, ['request', 'body']),
  middlewareGuard(async ctx => {
    const app = ctx.request.body;

    const response = await appCollection.insertOne(app);

    ctx.body = ok({ _id: response.insertedId, ...app });
  })
)

const PartialApplicationWithIdSchema = ApplicationWithIdSchema.partial();

router.patch('/',
  adminsOnly,
  validate(PartialApplicationWithIdSchema, ['request', 'body']),
  middlewareGuard(async ctx => {
    const application = ctx.request.body;

    const response = await appCollection.findOneAndUpdate(
      { _id: application._id },
      { $set: application },
      { returnDocument: 'after' }
    );

    if (!response.ok) {
      throw new Error('unknown error occured when attempting to update the app');
    }
    else if (!response.value) {
      ctx.status = 400;
      ctx.body = err("No app exists with the given id")
    }

    ctx.body = ok(response.value)
  })
)

router.delete('/',
  adminsOnly,
  validate(ObjectIdSchema, ['request', 'body', '_id']),
  middlewareGuard(async ctx => {
    const { _id } = ctx.request.body

    const response = await appCollection.findOneAndDelete({ _id });
    if (!response.ok) {
      throw new Error('Unknown error occured while attempting to delete an app');
    }
    else if (!response.value) {
      ctx.status = 400;
      ctx.body = err("No app exists with the given id");
      return;
    }

    ctx.body = ok(response.value);
  })
)

export default router;