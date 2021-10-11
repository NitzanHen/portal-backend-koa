import Router from '@koa/router';
import { ObjectId } from 'bson';
import { z } from 'zod';
import { isNoSuchResourceError } from '../common/NoSuchResourceError';
import { err, ok } from '../common/Result';
import { adminsOnly } from '../middleware/adminsOnly';
import { middlewareGuard } from '../middleware/middlewareGuard';
import { validate } from '../middleware/validate';
import { Application, ApplicationSchema, NewApplicationSchema } from '../model/Application';
import { ObjectIdSchema } from '../model/ObjectId';
import { appService } from '../service/ApplicationService';
import { CtxState } from '../types/CtxState';
import { sendToClients } from '../websocket/wss';


const router = new Router<CtxState>({
  prefix: '/application'
});

router.get('/', middlewareGuard(async ctx => {
  const { user } = ctx.state;

  const apps = await appService.findByGroups(user.groups);

  ctx.body = ok(apps);
}));

router.get<{ _id: ObjectId }>(
  '/:_id',
  validate(ObjectIdSchema, '_id', ['params', '_id']),
  middlewareGuard(async ctx => {
    const { _id } = ctx.state;

    const result = await appService.findById(_id);
    if (!result.ok) {
      const { err: error } = result;
      if (isNoSuchResourceError(error)) {
        ctx.status = 400;
        ctx.body = err(error.message);
        return;
      }

      // Unexpected error.
      throw error;
    }

    ctx.body = ok(result.data);
  })
);

router.get<{ title: string }>(
  '/title-available/:title',
  adminsOnly,
  validate(ApplicationSchema.shape.title, 'title', ['params', 'title']),
  middlewareGuard(async ctx => {
    const { title } = ctx.state;

    const isAvailable = await appService.isTitleAvailable(title);

    return ok(isAvailable);
  })
);

router.post<{ app: Application }>(
  '/',
  adminsOnly,
  validate(NewApplicationSchema, 'app', ['request', 'body']),
  middlewareGuard(async ctx => {

    const result = await appService.insert(ctx.state.app);
    if (!result.ok) {
      throw result.err;
    }

    const createdApp = result.data;

    sendToClients({ entityType: 'app', entity: createdApp._id, action: 'created' }, createdApp.groups);

    ctx.body = ok(result.data);
  })
);

const PartialApplicationWithIdSchema = ApplicationSchema.partial().extend({
  _id: ObjectIdSchema
});
interface PartialApplicationWithId extends z.infer<typeof PartialApplicationWithIdSchema> { }

router.patch<{ patch: PartialApplicationWithId }>(
  '/',
  adminsOnly,
  validate(PartialApplicationWithIdSchema, 'patch', ['request', 'body']),
  middlewareGuard(async ctx => {
    const { patch } = ctx.state;

    const result = await appService.update(patch._id, patch);

    if (!result.ok) {
      const { err: error } = result;
      if (isNoSuchResourceError(error)) {
        ctx.status = 400;
        ctx.body = err(error.message);
        return;
      }

      throw error;
    }

    const updatedApp = result.data;
    console.log(updatedApp);

    sendToClients({ entityType: 'app', entity: updatedApp._id, action: 'updated' }, updatedApp.groups);

    ctx.body = ok(updatedApp);
  })
);

router.delete<{ _id: ObjectId }>(
  '/',
  adminsOnly,
  validate(ObjectIdSchema, '_id', ['request', 'body', '_id']),
  middlewareGuard(async ctx => {
    const { _id } = ctx.state;

    const result = await appService.delete(_id);
    if (!result.ok) {
      const { err: error } = result;
      if (isNoSuchResourceError(error)) {
        ctx.status = 400;
        ctx.body = err(error.message);
        return;
      }

      throw error;
    }

    const deletedApp = result.data;
    sendToClients({ entityType: 'app', entity: deletedApp._id, action: 'updated' }, deletedApp.groups);

    ctx.body = ok(deletedApp);
  })
);

export default router;