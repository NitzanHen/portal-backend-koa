import { Middleware } from 'koa';
import { Schema, ZodTypeDef } from 'zod';

const get = (o: any, path: string[]): unknown => path.reduce((acc, key) => acc[key], o);

/**
 * A validation/parsing middleware.
 * 
 * @param schema the Zod schema to parse by.
 * @param outname the name of the field in which to store the output.
 * Output is always stored as a field on `ctx.state`, e.g. passing `'app'` will store the output on `ctx.state.app`
 * @param path the "path" to the data to be parsed, relative to `ctx`. 
 * For example, `['request', 'body']` tells the middleware to read `ctx.request.body`
 */
export const validate = <T, OutName extends string>(
  schema: Schema<T, ZodTypeDef, any>,
  outname: OutName,
  path: string[]
): Middleware<Record<OutName, T>> => async (ctx, next) => {
  const value = get(ctx, path);

  const result = schema.safeParse(value);
  if (!result.success) {
    ctx.status = 400;
    ctx.body = result.error;
    return;
  }

  ctx.state[outname] = result.data;
  await next();
};