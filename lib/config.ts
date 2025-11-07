// Environment validation - simplified
export function validateEnvironment() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate URL formats
  try {
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid URL');
  }
}

// Error handling utilities
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleApiError(error: unknown, operation: string) {
  console.error(`${operation} failed:`, error);

  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
    };
  }

  if (error instanceof Error && error.name === 'ZodError') {
    return {
      error: 'Invalid input data',
      code: 'VALIDATION_ERROR',
      details: error.message,
    };
  }

  return {
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  };
}

// Master account helpers
export const isMasterAccountEnabled = (): boolean => process.env.NEXT_PUBLIC_ENABLE_MASTER_ACCOUNT === 'true';

export function requireMasterAccountEnabled(): void {
  if (!isMasterAccountEnabled()) {
    throw new AppError('Master account feature is disabled', 404, 'MASTER_ACCOUNT_DISABLED');
  }
}
