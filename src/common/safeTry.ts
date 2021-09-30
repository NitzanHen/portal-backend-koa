import { err, ok, Result } from './Result';

/**
 * A safe variant of try-catch, which returns an error object instead of throwing
 * in case of an error.
 */
export const safeTry = <T>(fn: () => T): Result<T, unknown> => {
  try {
    return ok(fn());
  }
  catch (e) {
    return err(e);
  }
};