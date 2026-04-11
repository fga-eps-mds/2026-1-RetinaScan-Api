import { ApiError } from '.';

export class AuthenticationError extends ApiError {
  constructor(message = 'Authentication failed') {
    super(message, 'AuthenticationError', 401);
  }
}
