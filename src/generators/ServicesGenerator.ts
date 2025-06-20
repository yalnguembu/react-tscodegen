import { BaseGenerator } from '../BaseGenerator.js';
import { FileSystemAPI } from '../FileSystem.js';
import { EndpointInfo, HttpMethod } from '../types.js';

// Define response wrapper types locally
export interface ResponseOnSuccess<T> {
  status: 'success';
  data: T;
}

export interface ResponseOnError {
  status: 'error';
  message: string;
}

export class ServicesGenerator extends BaseGenerator {
  private _generatedServices: Map<string, string> = new Map();

  protected getGeneratorKey(): string {
    return 'services';
  }

  protected performGeneration(): Map<string, string> {
    this.notifyObservers('generation_started', { generator: 'services' });
    
    const serviceGroups = this.groupEndpointsByTag();
    
    Object.entries(serviceGroups).forEach(([serviceName, endpoints]) => {
      const serviceCode = this.generateServiceClass(serviceName, endpoints);
      this._generatedServices.set(serviceName, serviceCode);
    });

    this.notifyObservers('generation_completed', { 
      generator: 'services', 
      count: this._generatedServices.size 
    });
    
    return this._generatedServices;
  }

  protected generateFiles(fs: FileSystemAPI): void {
    const servicesDir = this.getOutputDirectory();
    fs.ensureDirectoryExists(servicesDir);

    let indexFileContent = '// Auto-generated services from API spec\n\n';

    this._generatedServices.forEach((content, name) => {
      const fileName = `${this.toKebabCase(name)}.ts`;
      const filePath = fs.joinPath(servicesDir, fileName);
      
      fs.writeFile(filePath, content);
      
      const exportName = name.charAt(0).toLowerCase() + name.slice(1);
      indexFileContent += `export { ${name}, ${exportName} } from './${this.toKebabCase(name)}';\n`;
    });

    this.createIndexFile(servicesDir, indexFileContent, fs);
  }

  // Keep old public methods for backward compatibility
  generate(): Map<string, string> {
    return super.generate();
  }
  
  saveFiles(fs: FileSystemAPI): void {
    super.saveFiles(fs);
  }
  
  private groupEndpointsByTag(): Record<string, EndpointInfo[]> {
    const groups: Record<string, EndpointInfo[]> = {};

    Object.entries(this.spec.paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, endpoint]) => {
        const tag = endpoint.tags?.[0] || 'Default';
        const serviceName = `${tag}Service`;

        if (!groups[serviceName]) {
          groups[serviceName] = [];
        }

        groups[serviceName].push({
          path,
          method: method.toUpperCase() as HttpMethod,
          endpoint,
          operationId: this.generateOperationId(method, path),
        });
      });
    });

    return groups;
  }
  
  private generateOperationId(method: string, path: string): string {
    // Convert path parameters from {param} to ByParam
    const pathFormatted = path.replace(/{([^}]+)}/g, (_, param) => 
      'By' + param.charAt(0).toUpperCase() + param.slice(1)
    );
    
    // Extract resource name from path
    const parts = pathFormatted.split('/').filter(p => p.length > 0);
    const resourceName = parts.length > 0 ? parts[parts.length - 1] : 'resource';
    
    // Generate operation based on method and resource
    switch (method.toLowerCase()) {
      case 'get':
        // If path ends with an ID parameter, it's a "get by id" operation
        if (path.match(/\/[^/]*{[^}]+}$/)) {
          return `get${resourceName.charAt(0).toUpperCase() + resourceName.slice(1, -1) || resourceName}`;
        }
        return `list${resourceName.charAt(0).toUpperCase() + resourceName.slice(0, -1) || resourceName}`;
      case 'post':
        return `create${resourceName.charAt(0).toUpperCase() + resourceName.slice(0, -1) || resourceName}`;
      case 'put':
        return `update${resourceName.charAt(0).toUpperCase() + resourceName.slice(0, -1) || resourceName}`;
      case 'patch':
        return `patch${resourceName.charAt(0).toUpperCase() + resourceName.slice(0, -1) || resourceName}`;
      case 'delete':
        return `delete${resourceName.charAt(0).toUpperCase() + resourceName.slice(0, -1) || resourceName}`;
      default:
        return `${method.toLowerCase()}${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}`;
    }
  }
  
  private generateServiceClass(serviceName: string, endpoints: EndpointInfo[]): string {
    const className = serviceName;
    const instanceName = serviceName.charAt(0).toLowerCase() + serviceName.slice(1);
    
    // Generate imports for types used in endpoints
    const usedTypes = new Set<string>();
    const viewTypes = new Set<string>();
    
    endpoints.forEach(endpoint => {
      // Add request body type if exists
      const requestBodySchema = this.getRequestBodySchema(endpoint);
      if (requestBodySchema && '$ref' in requestBodySchema) {
        const typeName = this.extractNameFromRef(requestBodySchema.$ref);
        usedTypes.add(typeName);
      }
      
      // Add response type if exists
      const responseBodySchema = this.getResponseBodySchema(endpoint);
      if (responseBodySchema && '$ref' in responseBodySchema) {
        const typeName = this.extractNameFromRef(responseBodySchema.$ref);
        usedTypes.add(typeName);
        
        // Add corresponding view type for responses
        const viewTypeName = typeName.replace(/DTO$|View$/, '');
        viewTypes.add(viewTypeName);
      }
    });
    
    // Generate service methods
    const methods = endpoints.map(endpoint => {
      // Process request parameters
      const pathParams = (endpoint.endpoint.parameters || [])
        .filter(p => p.in === 'path')
        .map(p => `${p.name}: ${this.getTypeFromSchema(p.schema)}`);
        
      const queryParams = (endpoint.endpoint.parameters || [])
        .filter(p => p.in === 'query')
        .map(p => `${p.name}${p.required ? '' : '?'}: ${this.getTypeFromSchema(p.schema)}`);
      
      // Process request body
      let requestBodyParam = '';
      const requestBodySchema = this.getRequestBodySchema(endpoint);
      if (requestBodySchema) {
        const isRequired = endpoint.endpoint.requestBody?.required ?? true;
        if ('$ref' in requestBodySchema) {
          const typeName = this.extractNameFromRef(requestBodySchema.$ref);
          requestBodyParam = `data${isRequired ? '' : '?'}: ${typeName}`;
          usedTypes.add(typeName);
        } else {
          requestBodyParam = `data${isRequired ? '' : '?'}: any`;
        }
      }
      
      // Combine all parameters
      const allParams = [...pathParams, ...queryParams];
      if (requestBodyParam) allParams.push(requestBodyParam);
      const paramsString = allParams.join(', ');      // Generate return type
      const responseBodySchema = this.getResponseBodySchema(endpoint);
      let returnType = 'CancelablePromise<ResponseOnSuccess<void> | ResponseOnError>';
      let responseDataType = 'void';
      let isArrayResponse = false;
      let viewTypeName = '';
      let rawResponseType = 'void';
      
      if (responseBodySchema) {
        if ('$ref' in responseBodySchema) {
          const typeName = this.extractNameFromRef(responseBodySchema.$ref);
          viewTypeName = `${typeName.replace(/DTO$|View$/, '')}`;
          rawResponseType = typeName;
          
          // Check if it's an array response by looking at the operation ID and HTTP method
          isArrayResponse = endpoint.method === 'GET' && 
            !endpoint.path.match(/\/[^/]*{[^}]+}$/) || // Not ending with a path param
            endpoint.operationId.startsWith('list') || 
            endpoint.operationId.startsWith('getAll');
            
          if (isArrayResponse) {
            responseDataType = `${viewTypeName}[]`;
            rawResponseType = `${typeName}[]`;
            returnType = `CancelablePromise<ResponseOnSuccess<${viewTypeName}[]> | ResponseOnError>`;
          } else {
            responseDataType = viewTypeName;
            returnType = `CancelablePromise<ResponseOnSuccess<${viewTypeName}> | ResponseOnError>`;
          }
          
          usedTypes.add(typeName);
          viewTypes.add(viewTypeName);
        } else {
          responseDataType = 'any';
          rawResponseType = 'any';
          returnType = 'CancelablePromise<ResponseOnSuccess<any> | ResponseOnError>';
        }
      }
      
      // Format URL with path parameters
      let url = endpoint.path;
      (endpoint.endpoint.parameters || [])
        .filter(p => p.in === 'path')
        .forEach(p => {
          url = url.replace(`{${p.name}}`, `\${${p.name}}`);
        });
      
      // Handle query parameters
      let queryParamsCode = '';
      if (queryParams.length > 0) {
        queryParamsCode = `
    // Add query parameters
    const params = new URLSearchParams();
    ${(endpoint.endpoint.parameters || [])
      .filter(p => p.in === 'query')
      .map(p => {
        const accessor = p.required ? p.name : `${p.name} !== undefined ? ${p.name} : null`;
        return `if (${accessor} !== null) params.append('${p.name}', String(${p.name}));`;
      }).join('\n    ')}
    const queryString = params.toString();
    const urlWithParams = queryString ? \`\${url}?\${queryString}\` : url;`;
      }      // Generate service method
      const methodName = endpoint.operationId;
      const method = endpoint.method.toLowerCase();
      
      // Extract API endpoint path parameters
      const pathParamNames = (endpoint.endpoint.parameters || [])
        .filter(p => p.in === 'path')
        .map(p => p.name);
      
      // Extract API endpoint query parameters
      const queryParamNames = (endpoint.endpoint.parameters || [])
        .filter(p => p.in === 'query')
        .map(p => p.name);
      
      // Create request options object structure
      let requestOptionsStructure = '';
        // Add path params if present
      if (pathParamNames.length > 0) {
        requestOptionsStructure += `path: {
        ${pathParamNames.map(p => `${p}`).join(',\n        ')}
      },\n      `;
      }
      
      // Add query params if present
      if (queryParamNames.length > 0) {
        requestOptionsStructure += `query: {
        ${queryParamNames.map(p => `${p}`).join(',\n        ')}
      },\n      `;
      }
        // Add request body if present
      if (requestBodyParam) {
        requestOptionsStructure += `requestBody: data,\n      `;
      }
      
      return `
  /**
   * ${endpoint.endpoint.summary || `${methodName} - ${method.toUpperCase()} ${endpoint.path}`}
   * @returns ${returnType}
   */
  ${methodName}(${paramsString}): ${returnType} {
    return this.request<${rawResponseType}>({
      method: '${method.toUpperCase()}',
      url: '${endpoint.path}',
      ${requestOptionsStructure.length > 0 ? requestOptionsStructure : ''}
    }).then(
      (response): ResponseOnSuccess<${responseDataType}> => ({
        status: 'success' as const,
        ${responseDataType === 'void' ? 
          'data: undefined' : 
          isArrayResponse ? 
            'data: response.map(item => new ' + viewTypeName + '(item))' : 
            'data: new ' + viewTypeName + '(response)'
        }
      })
    ).catch(
      (error): ResponseOnError => ({
        status: 'error' as const,
        message: (error as Error).message
      })
    );
  }`;
    }).join('\n');    // Create service class with singleton pattern
    const typeImports = Array.from(usedTypes).length > 0 
      ? `import { ${Array.from(usedTypes).join(', ')} } from '../types';\n` 
      : '';
    
    // Add imports for entity/view classes
    const entityImports = Array.from(viewTypes).map(viewType => 
      `import { ${viewType} } from './entities/${viewType}.entity';`
    ).join('\n');
    
    // Add import for response types if used 
    const responseImports = `import type { ResponseOnSuccess, ResponseOnError } from '@core/Errors';`;
      // Add import for API client types
    const apiClientImports = `import { OpenAPI } from '../core/OpenAPI';
import { request } from '../core/request';
import { CancelablePromise } from '../core/CancelablePromise';`;
    
    const allImports = [typeImports, entityImports, responseImports, apiClientImports]
      .filter(Boolean).join('\n') + '\n\n';
    
    return `${allImports}/**
 * ${serviceName} - API client for ${serviceName.replace('Service', '')} endpoints
 */
export class ${className} {  /**
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
  }${methods}
}

// Singleton instance
export const ${instanceName} = new ${className}();
`;
  }
  
  private getRequestBodySchema(endpoint: EndpointInfo) {
    if (!endpoint.endpoint.requestBody?.content?.['application/json']?.schema) return null;
    
    return endpoint.endpoint.requestBody.content['application/json'].schema;
  }
  
  private getResponseBodySchema(endpoint: EndpointInfo) {
    // Look for 200 or 201 response
    const successResponse = endpoint.endpoint.responses['200'] || 
                           endpoint.endpoint.responses['201'];
    
    if (!successResponse?.content?.['application/json']?.schema) return null;
    
    return successResponse.content['application/json'].schema;
  }
  
  protected getTypeFromSchema(schema: any): string {
    if (schema.$ref) {
      return this.extractNameFromRef(schema.$ref);
    }
    
    switch (schema.type) {
      case 'string':
        if (schema.enum) {
          return schema.enum.map((e: string) => `'${e}'`).join(' | ');
        }
        return 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        const itemType = schema.items ? this.getTypeFromSchema(schema.items) : 'any';
        return `${itemType}[]`;
      case 'object':
        if (schema.properties) {
          const propTypes = Object.entries(schema.properties).map(([key, val]) => 
            `${key}: ${this.getTypeFromSchema(val)}`
          ).join(', ');
          return `{ ${propTypes} }`;
        }
        return 'Record<string, any>';
      default:
        return 'any';
    }
  }
}
