export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: Record<string, unknown> | undefined;

  constructor(statusCode: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: Record<string, unknown>) {
    super(400, "VALIDATION_ERROR", message, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required") {
    super(401, "AUTHENTICATION_ERROR", message);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(403, "AUTHORIZATION_ERROR", message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, "NOT_FOUND", message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource conflict") {
    super(409, "CONFLICT", message);
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests") {
    super(429, "RATE_LIMIT_EXCEEDED", message);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message = "An upstream service failed", details?: Record<string, unknown>) {
    super(502, "EXTERNAL_SERVICE_ERROR", message, details);
  }
}
