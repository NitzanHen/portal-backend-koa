import { Middleware } from 'koa';
import { Schema, ZodTypeDef } from 'zod';

const get = (o: any, path: string[]): unknown => path.reduce((acc, key) => acc[key], o);

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