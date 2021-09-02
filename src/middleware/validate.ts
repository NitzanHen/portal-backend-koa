import { Middleware } from 'koa';
import { reduce } from 'rhax';
import { Schema } from 'zod';
import { err } from '../common/Result.js';

const get = (o: any, path: string[]) => reduce(
  (acc, key) => acc[key],
  o,
  path
)

const set = (o: any, path: string[], value: any) => {
  let pos = o;
  for(let i = 0; i < path.length - 1; i++) {
    const key = path[i]
    if(!pos[key]) {
      pos[key] = {};
    }
    pos = pos[key]
  }

  pos[path[path.length - 1]] = value;

  return o;
}

export const validate = (schema: Schema<any>, path: string[]): Middleware => {
  return async (ctx, next) => {
    const value = get(ctx, path);
    const result = schema.safeParse(value);
    if (!result.success) {
      ctx.status = 400;
      ctx.body = err(result.error)
      return;
    }

    set(ctx, path, result.data);
    await next()
  }
}