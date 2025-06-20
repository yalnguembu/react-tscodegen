/**
 * Helper functions for the Express.js API mock server
 */
// @ts-ignore - These types are available at runtime when Express is installed
import { Request, Response } from 'express';
// Define minimal typings in case the express module is not available during generation
type ExpressRequest = {
  body?: any;
  query?: any;
  params?: any;
  protocol?: string;
  get?: (name: string) => string;
  path?: string;
};

type ExpressResponse = {
  status: (code: number) => ExpressResponse;
  json: (data: any) => void;
  send: (data: any) => void;
  end: () => void;
};

/**
 * Standard response wrapper format for successful responses
 */
export interface ResponseWrapper<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Paginated response wrapper format for list endpoints
 */
export interface PaginatedResponseWrapper<T> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    count: number;
    perPage: number;
    currentPage: number;
    totalPages: number;
    links: {
      first?: string;
      last?: string;
      prev?: string;
      next?: string;
    }
  };
}

/**
 * Error response format
 */
export interface ErrorResponse {
  success: boolean;
  error: string;
  message: string;
  details?: any;
  statusCode: number;
}

/**
 * Simulates network latency by waiting a random time
 */
export async function simulateNetworkDelay(minMs = 50, maxMs = 300): Promise<void> {
  const delay = Math.random() * (maxMs - minMs) + minMs;
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Extract a status code from request data based on predetermined patterns
 * @param req Express request object
 * @returns Status code and error message if applicable
 */
export function getResponseStatus(req: Request | ExpressRequest): { 
  statusCode: number, 
  message?: string 
} {
  // Check request body first if it exists
  if (req.body && typeof req.body === 'object') {
    // If id field is present and matches a special code
    if ('id' in req.body) {
      const idValue = Number(req.body.id);
      if ([201, 400, 401, 403, 404, 500].includes(idValue)) {
        return {
          statusCode: idValue,
          message: getErrorMessageForCode(idValue)
        };
      }
    }
    
    // Check for specific header or query param to force error
    if (req.query._status) {
      const statusCode = Number(req.query._status);
      if (!isNaN(statusCode) && statusCode >= 200 && statusCode < 600) {
        return {
          statusCode,
          message: getErrorMessageForCode(statusCode)
        };
      }
    }
    
    // Check payload for error pattern like "FAIL_VALIDATION" or "UNAUTHORIZED" etc
    if ('_error' in req.body && typeof req.body._error === 'string') {
      const errorType = req.body._error.toUpperCase();
      switch (errorType) {
        case 'VALIDATION':
        case 'INVALID':
          return { statusCode: 400, message: 'Validation failed for provided data' };
        case 'UNAUTHORIZED':
          return { statusCode: 401, message: 'Authentication required' };
        case 'FORBIDDEN':
          return { statusCode: 403, message: 'Permission denied' };
        case 'NOT_FOUND':
          return { statusCode: 404, message: 'Resource not found' };
        case 'SERVER_ERROR':
          return { statusCode: 500, message: 'Internal server error' };
        case 'TIMEOUT':
          return { statusCode: 504, message: 'Request timed out' };
      }
    }
  }

  // Check route/path parameters
  if (req.params && Object.keys(req.params).includes('id')) {
    const idValue = Number(req.params.id);
    if ([400, 401, 403, 404, 500].includes(idValue)) {
      return {
        statusCode: idValue,
        message: getErrorMessageForCode(idValue)
      };
    }
  }
  
  // Default to 200 OK
  return { statusCode: 200 };
}

/**
 * Get appropriate error message for status codes
 */
function getErrorMessageForCode(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Bad Request: The server could not understand the request due to invalid syntax';
    case 401:
      return 'Unauthorized: Authentication is required and has failed or has not been provided';
    case 403:
      return 'Forbidden: You do not have permission to access this resource';
    case 404:
      return 'Not Found: The requested resource could not be found';
    case 500:
      return 'Internal Server Error: Something went wrong on the server';
    default:
      return `Error with status code ${statusCode}`;
  }
}

/**
 * Wraps success response data in the standard format
 */
export function wrapResponse<T>(data: T, message?: string): ResponseWrapper<T> {
  return {
    success: true,
    data,
    message
  };
}

/**
 * Creates a paginated response for list endpoints
 */
export function wrapPaginatedResponse<T>(
  data: T[],
  page = 1,
  perPage = 20,
  total = data.length,
  baseUrl = ''
): PaginatedResponseWrapper<T> {
  const totalPages = Math.ceil(total / perPage);
  
  // Calculate pagination data
  const startIndex = (page - 1) * perPage;
  const endIndex = Math.min(startIndex + perPage, data.length);
  const paginatedData = data.slice(startIndex, endIndex);
  
  // Build pagination links
  const links: Record<string, string | undefined> = {};
  
  if (baseUrl) {
    links.first = `${baseUrl}?page=1&perPage=${perPage}`;
    links.last = `${baseUrl}?page=${totalPages}&perPage=${perPage}`;
    
    if (page > 1) {
      links.prev = `${baseUrl}?page=${page - 1}&perPage=${perPage}`;
    }
    
    if (page < totalPages) {
      links.next = `${baseUrl}?page=${page + 1}&perPage=${perPage}`;
    }
  }
  
  return {
    success: true,
    data: paginatedData,
    meta: {
      total,
      count: paginatedData.length,
      perPage,
      currentPage: page,
      totalPages,
      links
    }
  };
}

/**
 * Creates an error response object
 */
export function createErrorResponse(
  statusCode: number,
  error: string,
  message: string,
  details?: any
): ErrorResponse {
  return {
    success: false,
    error,
    message,
    details,
    statusCode
  };
}

/**
 * Handle error responses in Express routes
 */
export function handleErrorResponse(error: any, res: Response | ExpressResponse): void {
  const statusCodeMatch = error?.message?.match(/status (\d+)/i);
  let statusCode = 500;
  let errorMessage = 'An unexpected error occurred';
  
  if (statusCodeMatch && statusCodeMatch[1]) {
    statusCode = parseInt(statusCodeMatch[1], 10);
    errorMessage = getErrorMessageForCode(statusCode);
  }
  
  const errorResponse: ErrorResponse = {
    success: false,
    error: getErrorTitle(statusCode),
    message: errorMessage,
    statusCode
  };
  
  res.status(statusCode).json(errorResponse);
}

/**
 * Get error title based on status code
 */
function getErrorTitle(statusCode: number): string {
  switch (statusCode) {
    case 400: return 'Bad Request';
    case 401: return 'Unauthorized';
    case 403: return 'Forbidden';
    case 404: return 'Not Found';
    case 500: return 'Internal Server Error';
    default: return `Error ${statusCode}`;
  }
}
