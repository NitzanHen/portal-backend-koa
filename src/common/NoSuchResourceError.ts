export class NoSuchResourceError extends Error {
  name = 'NoSuchResourceError'

  constructor() {
    super('The specified resource does not exist');
  }

  toJSON() {
    return this.message;
  }
}


export const isNoSuchResourceError = (target: unknown): target is NoSuchResourceError => target instanceof Error && target.name === 'NoSuchResourceError';