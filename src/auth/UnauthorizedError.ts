
export class UnauthorizedError extends Error {
  name = 'UnauthorizedError'

  constructor(message = 'Unauthorized') {
    super(message);
  }

  toJSON() {
    return this.message;
  }
}

export const isUnauthorizedError = (target: unknown): target is UnauthorizedError => target instanceof Error && target.name === 'UnauthorizedError';