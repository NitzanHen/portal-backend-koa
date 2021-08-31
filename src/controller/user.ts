import Router from '@koa/router';
import { db } from 'peripheral/db';

const userCollection = db.collection('users');

const router = new Router({ 
  prefix: '/user' 
});

router.get('/', async ctx => {
  try {
    const users = await userCollection.find({}).toArray();

    ctx.body = users;
  }
  catch(e: any) {
    ctx.throw(e.message);
  }
});

router.get('/:id', ctx => {});

router.post('/', ctx => {});

router.patch('/', ctx => {});

// router.post('/:id/favourite', ctx => {})

export default router;