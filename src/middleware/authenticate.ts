import { Middleware } from 'koa';
import { CtxState } from '../types/CtxState';
import { err } from '../common/Result';
import { isUnauthorizedError, UnauthorizedError } from '../auth/UnauthorizedError';
import { isNoSuchResourceError } from '../common/NoSuchResourceError';
import { authenticate } from '../auth/authenticate';
import { middlewareGuard } from './middlewareGuard';

/**
 * Authenticator middleware; expects an OAuth2 Bearer token, i.e.
 * an Authorization header containing `Bearer [token]`, where token is a JWT token.
 */
export const authenticateMiddleware: Middleware<CtxState> = middlewareGuard(async (ctx, next) => {
  /** Helper function to return 401 properly if one of the checks fails. */
  const unauthorized = (error: UnauthorizedError) => {
    ctx.headers['www-authenticate'] = 'Bearer';
    ctx.status = 401;
    ctx.body = error;
    return;
  };

  const authResult = await authenticate(ctx.header.authorization);
  if (!authResult.ok) {
    const { err: error } = authResult;
    if (isUnauthorizedError(error)) {
      return unauthorized(error);
    }
    else if (isNoSuchResourceError(error)) {
      ctx.status = 403;
      ctx.body = err("JWT token is valid but the user isn't registered to the Agamim Portal.");
      return;
    }

    console.error(error);
    ctx.status = 500;
    ctx.body = err('Internal server error');
    return;
  }

  const user = authResult.data;
  ctx.state.user = user;

  await next();
});