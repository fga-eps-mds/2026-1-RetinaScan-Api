import { ApiError } from './api-error';

export class ConflictError extends ApiError {
  constructor(message: string) {
    super(message, 'ConflictError', 409);
  }
}
