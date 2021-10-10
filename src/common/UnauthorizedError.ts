
export class UnauthorizedError extends Error {
  name = 'UnauthorizedError'

  constructor(message?: string) {
    super(message);
  }

  toJSON() {
    return this.message;
  }
}

export const isUnauthorizedError = (target: unknown): target is UnauthorizedError => target instanceof Error && target.name === 'UnauthorizedError';