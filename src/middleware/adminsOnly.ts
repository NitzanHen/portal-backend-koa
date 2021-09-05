import { Middleware, ParameterizedContext } from 'koa';

/**
 * A middleware that allows only admin users through.
 * 
 * This middleware must be placed after `authenticate`! 
 * Particularily, `ctx.user` must exist.
 * 
 * @todo type this properly.
 */
export const adminsOnly: Middleware = async (ctx: ParameterizedContext, next) => {
  if(!ctx.user?.admin) {
    ctx.status = 403;
    return;
  }
  await next();
}