export type ErrorCode =
  | 'bad_request' | 'unauthorized' | 'forbidden' | 'not_found' | 'conflict'
  | 'locked' | 'too_large' | 'bad_origin' | 'setup_done' | 'not_configured';

const STATUS: Record<ErrorCode, number> = {
  bad_request: 400, unauthorized: 401, forbidden: 403, not_found: 404, conflict: 409,
  locked: 423, too_large: 413, bad_origin: 403, setup_done: 409, not_configured: 503,
};

export class AppError extends Error {
  readonly status: number;
  constructor(readonly code: ErrorCode, message: string = code) {
    super(message);
    this.status = STATUS[code];
  }
}

export const notFound = (): AppError => new AppError('not_found');
export const conflict = (): AppError => new AppError('conflict');
