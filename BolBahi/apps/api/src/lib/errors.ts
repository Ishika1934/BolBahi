export type ErrorCode =
  | 'VALIDATION'
  | 'LLM_TIMEOUT'
  | 'LLM_RATE_LIMIT'
  | 'LLM_BAD_OUTPUT'
  | 'NOT_FOUND'
  | 'AMBIGUOUS'
  | 'MAIL_FAILED'
  | 'INTERNAL'
  | 'AUTH_REQUIRED'
  | 'AUTH_INVALID';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly spokenMessage: string;

  constructor(
    code: ErrorCode,
    message: string,
    spokenMessage?: string,
    statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.spokenMessage = spokenMessage || 'Kuch gadbad ho gayi, dobara koshish karein.';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function notFoundError(resource: string = 'Record'): AppError {
  return new AppError('NOT_FOUND', `${resource} not found`, `${resource} nahi mila`, 404);
}

export function authRequiredError(): AppError {
  return new AppError('AUTH_REQUIRED', 'Authentication required', 'Pehle login karein', 401);
}

export function authInvalidError(): AppError {
  return new AppError('AUTH_INVALID', 'Invalid credentials', 'Email ya password galat hai', 401);
}

