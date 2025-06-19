// This file provides the API client implementation that will be used by generated services

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  params?: Record<string, string | number | boolean>;
}

export class ApiClient {
  private baseUrl: string;
  
  constructor(baseUrl: string = '/api/v1') {
    this.baseUrl = baseUrl;
  }
    async get<T>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url);
  }
  
  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data);
  }
  
  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, data);
  }
  
  async delete<T>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url);
  }
  
  async patch<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', url, data);
  }
    private async request<T>(
    method: string, 
    url: string, 
    data?: any
  ): Promise<ApiResponse<T>> {
    const requestUrl = `${this.baseUrl}${url}`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // Make the request
    const response = await fetch(requestUrl, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined
    });
    
    // Parse the response
    let responseData: T;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text() as unknown as T;
    }
    
    // Extract headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    
    return {
      data: responseData,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    };
  }
}

// Create a default instance
export const apiClient = new ApiClient();

// Export a factory function to create custom instances
export function createApiClient(baseUrl?: string): ApiClient {
  return new ApiClient(baseUrl);
}
