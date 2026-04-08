import { ApiError } from '.'

type FieldIssueBase = {
  path: (string | number)[]
  message?: string
}

export class ValidationError extends ApiError {
  public fields: FieldIssueBase[]
  public showMessage: boolean

  constructor(fields: FieldIssueBase[], showMessage: boolean = false) {
    super('Invalid attributes', 'ValidationError', 400, { fields })
    this.fields = fields
    this.showMessage = showMessage
  }
}
