export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(message: string, options?: { status?: number; code?: string }) {
    super(message);
    this.name = 'AppError';
    this.status = options?.status ?? 400;
    this.code = options?.code ?? 'BAD_REQUEST';
  }
}


