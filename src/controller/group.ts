import Router from '@koa/router';
import { err, ok } from '../common/Result.js';
import { middlewareGuard } from '../middleware/middlewareGuard.js';
import { validate } from '../middleware/validate.js';
import { ObjectIdSchema } from '../model/ObjectId.js';
import { db } from '../peripheral/db.js';

const groupCollection = db.collection('groups');

const router = new Router({
  prefix: '/group'
});

router.get('/',
  middlewareGuard(async (ctx, next) => {
    const groups = await groupCollection.find({}).toArray();

    ctx.body = ok(groups);
  })
);

router.get('/:id',
  validate(ObjectIdSchema, ['params', 'id']),
  middlewareGuard(async ctx => {
    const { id } = ctx.params;
    const group = await groupCollection.findOne({ _id: id });

    if(!group) {
      ctx.status = 400;
      ctx.body = err('No group exists with the given id');
      return;
    }
    ctx.body = ok(group)
  }),
);

router.post('/',
  middlewareGuard((ctx, next) => {

  }),
  middlewareGuard((ctx, next) => {

  })
);

router.delete('/',
  middlewareGuard((ctx, next) => {

  }),
  middlewareGuard((ctx, next) => {

  })
);

router.patch('/',
  middlewareGuard((ctx, next) => {

  }),
  middlewareGuard((ctx, next) => {

  })
);

router.get('/management',
  middlewareGuard((ctx, next) => {

  }),
  middlewareGuard((ctx, next) => {

  })
);

export default router;