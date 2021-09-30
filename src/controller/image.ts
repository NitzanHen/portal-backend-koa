import Router from '@koa/router';
import multer from '@koa/multer';
import { uploadImage } from '../peripheral/storage';
import { ok } from '../common/Result';
import { middlewareGuard } from '../middleware/middlewareGuard';

const router = new Router({
  prefix: '/image'
});

const upload = multer();

router.post('/', upload.single('image'),
  middlewareGuard(async ctx => {
    const { originalname, buffer } = ctx.file;

    const url = await uploadImage(originalname, buffer);
    ctx.body = ok(url);
  })
);

export default router;