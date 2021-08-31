import type { Middleware } from 'koa';
 
/**
 * Wraps the received middleware in a try/catch, returning status 500 to the sender if an error occures.
 */
export const middlewareGuard = (middleware: Middleware): Middleware => async (ctx, next) => {
  try {
    await middleware(ctx, next);
  }
  catch(e) {
    console.error(e);

    ctx.throw();
  }
}