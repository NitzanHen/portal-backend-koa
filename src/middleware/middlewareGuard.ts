import type { Middleware, ParameterizedContext } from 'koa';
import { DefaultState, DefaultContext } from 'koa';
import { err, Result } from '../common/Result.js';
import { CtxState } from '../types/CtxState.js';

/**
 * Wraps the received middleware in a try/catch, returning status 500 to the sender if an error occures.
 */
export const middlewareGuard = <StateT extends DefaultState & CtxState = DefaultState & CtxState, ContextT = DefaultContext, ResponseBodyT = any>(
  middleware: Middleware<StateT, ContextT, ResponseBodyT>
): Middleware<StateT, ContextT, ResponseBodyT | Result<never, unknown>> => async (ctx, next) => {
  try {
    await middleware(ctx as ParameterizedContext<StateT, ContextT, ResponseBodyT>, next);
  }
  catch (e) {
    console.error(e);

    ctx.status = 500;
    ctx.body = err('Internal Server error');
  }
};