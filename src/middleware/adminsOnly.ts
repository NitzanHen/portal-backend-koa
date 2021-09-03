import { Middleware } from 'koa';

/**
 * A middleware that allows only admin users through.
 * 
 * This middleware must be placed after `authenticate`! 
 * Particularily, `ctx.user` must exist.
 */
export const adminsOnly: Middleware = async (ctx, next) => {
  if(!ctx.user?.admin) {
    // Not an admin. Return 403.
    return ctx.throw(403);
  }

  await next();
}