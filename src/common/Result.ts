
export type Result<T, E = Error> = { ok: true, data: T, err?: never } | { ok: false, data?: never, err: E }

export const ok = <T>(data: T): Result<T, never> => ({ ok: true, data });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, err: error });