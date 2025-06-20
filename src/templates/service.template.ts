// Template for generating service classes

export const SERVICE_CLASS_TEMPLATE = `{{imports}}

/**
 * {{serviceName}} - API client for {{tag}} endpoints
 */
export class {{serviceName}} {{{privateRequestMethod}}
{{serviceMethods}}
}

// Singleton instance
export const {{serviceInstanceName}} = new {{serviceName}}();`;

export const SERVICE_IMPORTS_TEMPLATE = `{{typeImports}}

{{coreImports}}`;

export const SERVICE_TYPE_IMPORTS_TEMPLATE = `import { {{types}} } from '../types';`;

export const SERVICE_CORE_IMPORTS_TEMPLATE = `import { {{entities}} } from './entities/{{entityFile}}.entity';
import type { ResponseOnSuccess, ResponseOnError } from '@core/Errors';
import { OpenAPI } from '../core/OpenAPI';
import { request } from '../core/request';
import { CancelablePromise } from '../core/CancelablePromise';`;

export const SERVICE_REQUEST_METHOD_TEMPLATE = `  /**
   * Request method that handles API calls and maps responses
   */
  private request<T>(options: {
    method: string;
    url: string;
    path?: Record<string, any>;
    query?: Record<string, any>;
    body?: any;
    requestBody?: any;
    mediaType?: string;
    responseHeader?: string;
    errors?: Record<number, string>;
  }): CancelablePromise<T> {
    return request<T>(OpenAPI, {
      ...options,
      headers: { 'Content-Type': 'application/json' },
    });
  }`;

export const SERVICE_METHOD_TEMPLATE = `  /**
   * {{operationSummary}}
   * @returns CancelablePromise<ResponseOnSuccess<{{returnType}}> | ResponseOnError>
   */
  {{methodName}}({{parameters}}): CancelablePromise<ResponseOnSuccess<{{returnType}}> | ResponseOnError> {
    return this.request<{{responseType}}>({
      method: '{{httpMethod}}',
      url: '{{url}}',{{requestBodyParam}}
      {{additionalParams}}
    }).then(
      (response): ResponseOnSuccess<{{returnType}}> => ({
        status: 'success' as const,
        data: {{responseMapping}}
      })
    ).catch(
      (error): ResponseOnError => ({
        status: 'error' as const,
        message: (error as Error).message
      })
    );
  }`;

export const SERVICE_INDEX_TEMPLATE = `// Auto-generated API service classes from OpenAPI spec

{{exportStatements}}`;

export const SERVICE_PARAMETER_TEMPLATE = `{{paramName}}: {{paramType}}`;

export const SERVICE_REQUEST_BODY_TEMPLATE = `
      requestBody: {{paramName}},`;

export const SERVICE_ADDITIONAL_PARAMS_TEMPLATE = `{{paramName}}: {{paramValue}},`;

export const SERVICE_RESPONSE_MAPPING_SINGLE_TEMPLATE = `new {{entityName}}(response)`;

export const SERVICE_RESPONSE_MAPPING_ARRAY_TEMPLATE = `response.map(item => new {{entityName}}(item))`;

export const SERVICE_RESPONSE_MAPPING_PLAIN_TEMPLATE = `{{plainValue}}`;
