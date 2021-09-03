import type { Middleware } from 'koa';
import { DefaultState, DefaultContext } from 'koa';

/**
 * Wraps the received middleware in a try/catch, returning status 500 to the sender if an error occures.
 */
export const middlewareGuard = <StateT = DefaultState, ContextT = DefaultContext, ResponseBodyT = any>(
  middleware: Middleware<StateT, ContextT, ResponseBodyT>
): Middleware<StateT, ContextT, ResponseBodyT> => async (ctx, next) => {
  try {
    await middleware(ctx, next);
  }
  catch (e) {
    console.error(e);

    ctx.throw();
  }
}