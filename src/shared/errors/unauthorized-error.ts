import { ApiError } from '.';

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(message, 'UnauthorizedError', 403);
  }
}
