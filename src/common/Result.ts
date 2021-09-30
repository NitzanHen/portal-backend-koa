
export type Result<T, E = unknown> = { ok: true, data: T } | { ok: false, err: E }

export const ok = <T>(data: T): Result<T, never> => ({ ok: true, data });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, err: error });

export type AsyncResult<T, E = unknown> = Promise<Result<T, E>>; 

/** Resultifies a Promise, i.e. wraps the result (resolved or rejected) in a Result */
export const resultify = <T>(promise: Promise<T>): AsyncResult<T> => promise.then(ok).catch(err);
