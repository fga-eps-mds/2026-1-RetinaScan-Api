import { ApiError } from '.'

export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(message, 'NotFoundError', 404)
  }
}
