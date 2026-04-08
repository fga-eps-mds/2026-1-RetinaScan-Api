export class ApiError extends Error {
  public readonly statusCode: number
  public readonly metadata?: Record<string, unknown>

  constructor(
    message: string,
    name: string,
    statusCode: number,
    metadata?: Record<string, unknown>,
  ) {
    super(message)
    this.name = name
    this.statusCode = statusCode
    this.metadata = metadata
  }
}
