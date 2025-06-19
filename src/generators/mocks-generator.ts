import { BaseGenerator } from '../base-generator.js';
import { FileSystemAPI } from '../file-system.js';
import { EndpointInfo, HttpMethod } from '../types.js';

export class MocksGenerator extends BaseGenerator {
  private _generatedMocks: Map<string, string> = new Map();
  private _generatedServer: string = '';
  
  generate(): Map<string, string> {
    const serviceGroups = this.groupEndpointsByTag();
    
    // Generate individual mock services
    Object.entries(serviceGroups).forEach(([serviceName, endpoints]) => {
      const mockServiceCode = this.generateMockServiceFile(serviceName, endpoints);
      this._generatedMocks.set(serviceName, mockServiceCode);
    });
    
    // Generate Express.js server that uses the mock services
    this._generatedServer = this.generateExpressServer(serviceGroups);
    
    return this._generatedMocks;
  }
    saveFiles(fs: FileSystemAPI): void {
    const mocksDir = this.getOutputDirectory('mocks');
    fs.ensureDirectoryExists(mocksDir);
    
    // Create response utils first
    const responseUtilsPath = fs.joinPath(mocksDir, 'response-utils.ts');
    const responseUtilsContent = this.generateResponseUtils();
    fs.writeFile(responseUtilsPath, responseUtilsContent);
    
    // Save individual mock service files
    let indexFileContent = '// Auto-generated API mocks from OpenAPI spec\n\n';
    
    this._generatedMocks.forEach((content, name) => {
      const fileName = `${this.toKebabCase(name)}-mock.ts`;
      const filePath = fs.joinPath(mocksDir, fileName);
      
      fs.writeFile(filePath, content);
      
      const exportName = name.charAt(0).toLowerCase() + name.slice(1) + 'Mock';
      indexFileContent += `export { ${name}Mock, ${exportName} } from './${this.toKebabCase(name)}-mock';\n`;
    });
    
    // Add server exports to index
    indexFileContent += `\nexport { startMockServer } from './server';\n`;
    
    // Save Express.js server file
    const serverFilePath = fs.joinPath(mocksDir, 'server.ts');
    fs.writeFile(serverFilePath, this._generatedServer);
    
    // Save package.json for mock server
    const packageJsonPath = fs.joinPath(mocksDir, 'package.json');
    const packageJson = `{
  "name": "api-mock-server",
  "version": "1.0.0",
  "description": "Express.js mock server for API",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "ts-node-esm server.ts",
    "dev": "nodemon --exec ts-node-esm server.ts",
    "build": "tsc"
  },
  "dependencies": {
    "body-parser": "^1.20.2",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "@faker-js/faker": "^8.3.1",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "@types/body-parser": "^1.19.2",
    "@types/cors": "^2.8.13",
    "@types/express": "^4.17.17",
    "@types/morgan": "^1.9.4",
    "nodemon": "^3.0.1",
    "ts-node": "^10.9.1",
    "typescript": "^5.1.6"
  }
}`;
    fs.writeFile(packageJsonPath, packageJson);
      // Save README with instructions
    const readmePath = fs.joinPath(mocksDir, 'README.md');
    const readme = `# API Mock Server

This is an auto-generated Express.js mock server that simulates the API based on the OpenAPI specification.

## Features

- Simulates all API endpoints defined in the spec
- Generates realistic fake data using Faker.js with Lorem Ipsum text
- Returns properly structured success/error responses
- Can return different response codes based on request patterns
- Supports pagination for list endpoints
- Provides both network delay simulation and error simulation
- Fully configurable

## Installation

\`\`\`bash
npm install
\`\`\`

## Running the server

\`\`\`bash
npm start
\`\`\`

## Development mode (with auto-reload)

\`\`\`bash
npm run dev
\`\`\`

## Response Format

Successful responses are wrapped in a standard format:

\`\`\`json
{
  "success": true,
  "data": { /* actual response data */ },
  "message": "Operation successful"
}
\`\`\`

List endpoints include pagination metadata:

\`\`\`json
{
  "success": true,
  "data": [ /* array of items */ ],
  "meta": {
    "total": 100,
    "count": 20,
    "perPage": 20,
    "currentPage": 1,
    "totalPages": 5,
    "links": {
      "first": "/api/resources?page=1&perPage=20",
      "last": "/api/resources?page=5&perPage=20",
      "next": "/api/resources?page=2&perPage=20"
    }
  }
}
\`\`\`

Error responses follow this structure:

\`\`\`json
{
  "success": false,
  "error": "Not Found",
  "message": "The requested resource could not be found",
  "statusCode": 404
}
\`\`\`

## Simulating Different Responses

### 1. Using ID Values

You can force specific response codes by using these patterns in your requests:

| Value in request | Response Code | Description |
|------------------|---------------|-------------|
| id: 201          | 201           | Created     |
| id: 400          | 400           | Bad Request |
| id: 401          | 401           | Unauthorized|
| id: 403          | 403           | Forbidden   |
| id: 404          | 404           | Not Found   |
| id: 500          | 500           | Server Error|

Example:

\`\`\`json
// Will trigger a 400 Bad Request response
POST /api/users
{
  "name": "John Doe",
  "id": 400
}
\`\`\`

### 2. Using URL Parameters

\`\`\`
// Will return a 404 Not Found
GET /api/users/404
\`\`\`

### 3. Using Query Parameters

\`\`\`
// Will return a 403 Forbidden
GET /api/users?_status=403
\`\`\`

### 4. Using Error Type Field

\`\`\`json
// Will trigger a 400 Bad Request
POST /api/users
{
  "name": "John Doe",
  "_error": "VALIDATION"
}
\`\`\`

Available error types:
- "VALIDATION" or "INVALID" → 400 Bad Request
- "UNAUTHORIZED" → 401 Unauthorized
- "FORBIDDEN" → 403 Forbidden
- "NOT_FOUND" → 404 Not Found
- "SERVER_ERROR" → 500 Internal Server Error

## Pagination

For list endpoints, you can control pagination with:

\`\`\`
GET /api/users?page=2&perPage=10
\`\`\`

## Configuration

The server runs on port 3001 by default. You can change this by setting the PORT environment variable.

\`\`\`bash
PORT=8080 npm start
\`\`\`

You can also modify the server configuration by editing the serverOptions object in the server.ts file:

\`\`\`typescript
const serverOptions = {
  delayEnabled: true,  // Simulate network delay
  minDelay: 50,        // Minimum delay in ms
  maxDelay: 300,       // Maximum delay in ms
  paginate: true       // Enable pagination for list endpoints
};
\`\`\`
`;
    fs.writeFile(readmePath, readme);
    
    this.createIndexFile(mocksDir, indexFileContent, fs);
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
          operationId: this.generateOperationId(method, path, endpoint),
        });
      });
    });

    return groups;
  }
  
  private generateOperationId(method: string, path: string, endpoint: any): string {
    // Use the operationId from the spec if available
    if (endpoint.operationId) {
      return endpoint.operationId;
    }

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
        return `getAll${resourceName.charAt(0).toUpperCase() + resourceName.slice(0, -1) || resourceName}s`;
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
  
  private generateMockServiceFile(serviceName: string, endpoints: EndpointInfo[]): string {
    const className = `${serviceName.replace('Service', '')}Mock`;
    const instanceName = className.charAt(0).toLowerCase() + className.slice(1);
    
    // Generate imports for fake data
    const usedTypes = new Set<string>();
    endpoints.forEach(endpoint => {
      // Add response type if exists
      const responseBodySchema = this.getResponseBodySchema(endpoint);
      if (responseBodySchema && '$ref' in responseBodySchema) {
        usedTypes.add(this.extractNameFromRef(responseBodySchema.$ref));
      }
    });
    
    // Import fake data generators and faker
    const fakeDataImports = Array.from(usedTypes).map(type => {
      return `import { generate${type} } from '../fake-data/${this.toKebabCase(type)}-fake';`;
    }).join('\n');
    
    // Generate mock methods
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
      const paramsString = allParams.length > 0 ? `{ ${allParams.join(', ')} }` : '';
      
      // Generate return type
      const responseBodySchema = this.getResponseBodySchema(endpoint);
      let returnType = 'Promise<any>';
      let mockResponseGenerator = 'undefined';
      
      // Get all possible response codes for this endpoint
      const responseCodes = Object.keys(endpoint.endpoint.responses)
        .filter(code => code.match(/^\d+$/)) // Only numeric response codes
        .map(code => parseInt(code, 10));

      // Generate response handling with status code pattern recognition
      if (responseBodySchema) {
        if ('$ref' in responseBodySchema) {
          const typeName = this.extractNameFromRef(responseBodySchema.$ref);
          const isArray = endpoint.method === 'GET' && !endpoint.path.match(/\/[^/]*{[^}]+}$/);
          
          if (isArray) {
            returnType = `Promise<${typeName}[]>`;
            mockResponseGenerator = `
    // Check for special IDs to trigger specific status codes
    if (params && 'id' in params) {
      const id = Number(params.id);
      // Status code simulation based on ID value
      if ([400, 401, 403, 404, 500].includes(id)) {
        throw new Error(\`Simulated error with status \${id}\`);
      }
    }
    // Return array of mock data
    return Array.from({ length: Math.floor(Math.random() * 5) + 2 }).map(() => generate${typeName}())`;
          } else {
            returnType = `Promise<${typeName}>`;
            mockResponseGenerator = `    // Check for special IDs to trigger specific status codes
    if (${requestBodyParam ? 'data && data.id' : 'params && params.id'}) {
      const id = Number(${requestBodyParam ? 'data.id' : 'params.id'});
      // Status code simulation based on ID value
      if ([400, 401, 403, 404, 500].includes(id)) {
        throw new Error(\`Simulated error with status \${id}\`);
      }
      // Simulate created response
      if (id === 201) {
        // Return the data with id set to a new value
        return generate${typeName}();
      }
    }
    
    // Check for _error field to trigger specific errors
    if (${requestBodyParam ? 'data && data._error' : 'params && params._error'}) {
      const errorType = String(${requestBodyParam ? 'data._error' : 'params._error'}).toUpperCase();
      if (errorType === 'VALIDATION' || errorType === 'INVALID') {
        throw new Error('Simulated error with status 400');
      } else if (errorType === 'UNAUTHORIZED') {
        throw new Error('Simulated error with status 401');
      } else if (errorType === 'FORBIDDEN') {
        throw new Error('Simulated error with status 403');
      } else if (errorType === 'NOT_FOUND') {
        throw new Error('Simulated error with status 404');
      } else if (errorType === 'SERVER_ERROR') {
        throw new Error('Simulated error with status 500');
      }
    }
    
    // Default success response
    return generate${typeName}()`;
          }
        } else {
          returnType = 'Promise<any>';
          mockResponseGenerator = `    // Default success response for non-reference schema
    if (${requestBodyParam ? 'data && data.id' : 'params && params.id'}) {
      const id = Number(${requestBodyParam ? 'data.id' : 'params.id'});
      if ([400, 401, 403, 404, 500].includes(id)) {
        throw new Error(\`Simulated error with status \${id}\`);
      }
    }
    
    // Check for _error field to trigger specific errors
    if (${requestBodyParam ? 'data && data._error' : 'params && params._error'}) {
      const errorType = String(${requestBodyParam ? 'data._error' : 'params._error'}).toUpperCase();
      if (errorType === 'VALIDATION' || errorType === 'INVALID') {
        throw new Error('Simulated error with status 400');
      } else if (errorType === 'UNAUTHORIZED') {
        throw new Error('Simulated error with status 401');
      } else if (errorType === 'FORBIDDEN') {
        throw new Error('Simulated error with status 403');
      } else if (errorType === 'NOT_FOUND') {
        throw new Error('Simulated error with status 404');
      } else if (errorType === 'SERVER_ERROR') {
        throw new Error('Simulated error with status 500');
      }
    }
    
    return {}`;
        }
      } else if (endpoint.method === 'DELETE') {
        returnType = 'Promise<void>';
        mockResponseGenerator = `    // For DELETE operations, simply return nothing for success
    if (params && params.id) {
      const id = Number(params.id);
      if ([400, 401, 403, 404, 500].includes(id)) {
        throw new Error(\`Simulated error with status \${id}\`);
      }
    }
    
    // Check for _error field to trigger specific errors
    if (params && params._error) {
      const errorType = String(params._error).toUpperCase();
      if (errorType === 'VALIDATION' || errorType === 'INVALID') {
        throw new Error('Simulated error with status 400');
      } else if (errorType === 'UNAUTHORIZED') {
        throw new Error('Simulated error with status 401');
      } else if (errorType === 'FORBIDDEN') {
        throw new Error('Simulated error with status 403');
      } else if (errorType === 'NOT_FOUND') {
        throw new Error('Simulated error with status 404');
      } else if (errorType === 'SERVER_ERROR') {
        throw new Error('Simulated error with status 500');
      }
    }
    
    return`;
      }
      
      return `
  /**
   * Mock implementation for ${endpoint.operationId}
   * @description ${endpoint.endpoint.summary || ''}
   * @param ${paramsString} Request parameters
   * @returns Mock response data
   */
  async ${endpoint.operationId}(${paramsString}): ${returnType} {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 50));
    ${mockResponseGenerator}
  }`;
    }).join('\n');
    
    // Create mock service class with exports
    const imports = [
      '// Auto-generated API mock service',
      'import { faker } from "@faker-js/faker";',
      'import { CancelablePromise } from "../core/CancelablePromise";',
      fakeDataImports
    ].filter(Boolean).join('\n') + '\n\n';
    
    return `${imports}//**
 * ${className} - Mock API client for ${serviceName.replace('Service', '')} endpoints
 * This class provides mock implementations of API endpoints
 */
export class ${className} {${methods}

  /**
   * Helper method to determine response based on request data
   * @param request The request object
   * @returns Status code to use
   */
  private getResponseStatusFromRequest(request: any): number {
    if (!request) return 200;
    
    if (request.id) {
      const id = Number(request.id);
      // Special IDs trigger corresponding status codes
      if ([201, 400, 401, 403, 404, 500].includes(id)) {
        return id;
      }
    }
    
    return 200; // Default to OK
  }
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
  
  private getTypeFromSchema(schema: any): string {
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
  private generateExpressServer(serviceGroups: Record<string, EndpointInfo[]>): string {
    // Create imports section
    const serviceImports = Object.keys(serviceGroups)
      .map(serviceName => {
        const className = `${serviceName.replace('Service', '')}Mock`;
        const instanceName = className.charAt(0).toLowerCase() + className.slice(1);
        return `import { ${instanceName} } from './${this.toKebabCase(serviceName.replace('Service', ''))}-mock';`;
      })
      .join('\n');
    
    // Include an import for request helpers  
    const allImports = `${serviceImports}\n// We'll generate response utils directly since we're having module system compatibility issues`;

    // Create route handlers for each endpoint
    const routeHandlers = Object.entries(serviceGroups).flatMap(([serviceName, endpoints]) => {
      const instanceName = `${serviceName.replace('Service', '').charAt(0).toLowerCase()}${serviceName.replace('Service', '').slice(1)}Mock`;
      return endpoints.map(endpoint => {
        // Get HTTP method and normalized path
        const method = endpoint.method.toLowerCase();
        const expressPath = endpoint.path
          .replace(/\{([^}]+)\}/g, ':$1') // Convert {param} to :param
          .replace(/^\/?api\//, '/'); // Remove leading /api if present or add / if missing
        
        // Process parameters
        const pathParams = (endpoint.endpoint.parameters || [])
          .filter(p => p.in === 'path')
          .map(p => p.name);
          
        const queryParams = (endpoint.endpoint.parameters || [])
          .filter(p => p.in === 'query')
          .map(p => p.name);

        // Generate handler function
        let handlerCode = '';
        
        // Add special error handling for status code pattern matching
        let errorHandlingCode = `
  // Check for special status code IDs
  let statusCode = 200;
  let errorMessage = '';
  
  try {`;

        // Different handling based on method type
        switch(method) {          case 'get':
            const isListEndpoint = !endpoint.path.match(/\/[^/]*{[^}]+}$/);
            handlerCode = `
router.get('${expressPath}', async (req, res) => {
  logger.info('GET ${expressPath}');
  
  try {
    // Simulate network delay if enabled
    if (serverOptions.delayEnabled) {
      await simulateNetworkDelay(serverOptions.minDelay, serverOptions.maxDelay);
    }
    
    // Extract parameters
    const params = {
      ${pathParams.map(p => `${p}: req.params.${p}`).join(',\n      ')},
      ${queryParams.map(p => `${p}: req.query.${p}`).join(',\n      ')}
    };
    
    // Check for special response status
    const responseStatus = getResponseStatus(req);
    if (responseStatus.statusCode >= 400) {
      return res.status(responseStatus.statusCode).json({
        success: false,
        error: getErrorTitle(responseStatus.statusCode),
        message: responseStatus.message || 'An error occurred',
        statusCode: responseStatus.statusCode
      });
    }
    
    // Call the mock service
    const result = await ${instanceName}.${endpoint.operationId}(params);
    
    ${isListEndpoint ? `
    // Handle pagination for list endpoints
    if (Array.isArray(result) && serverOptions.paginate) {
      const page = Number(req.query.page) || 1;
      const perPage = Number(req.query.perPage) || 20;
      const baseUrl = \`\${req.protocol}://\${req.get('host')}\${req.path}\`;
      
      return res.json(wrapPaginatedResponse(result, page, perPage, result.length, baseUrl));
    }` : ''}
    
    // Return wrapped response
    res.json(wrapResponse(result));
  } catch (error) {
    handleError(error, res);
  }
});`;
            break;
              case 'post':
            handlerCode = `
router.post('${expressPath}', async (req, res) => {
  logger.info('POST ${expressPath}');
  
  try {
    // Simulate network delay if enabled
    if (serverOptions.delayEnabled) {
      await simulateNetworkDelay(serverOptions.minDelay, serverOptions.maxDelay);
    }
    
    // Extract parameters
    const params = {
      ${pathParams.map(p => `${p}: req.params.${p}`).join(',\n      ')}
    };
    
    const requestBody = req.body;
    
    // Check for special response status
    const responseStatus = getResponseStatus(req);
    if (responseStatus.statusCode >= 400) {
      return res.status(responseStatus.statusCode).json({
        success: false,
        error: getErrorTitle(responseStatus.statusCode),
        message: responseStatus.message || 'An error occurred',
        statusCode: responseStatus.statusCode
      });
    }
    
    // Call the mock service
    const result = await ${instanceName}.${endpoint.operationId}({ ...params, data: requestBody });
    
    // Created status for POST requests when appropriate
    if (responseStatus.statusCode === 201) {
      return res.status(201).json(wrapResponse(result, 'Resource created successfully'));
    }
    
    // Return wrapped response
    res.json(wrapResponse(result, 'Operation successful'));
  } catch (error) {
    handleError(error, res);
  }
});`;
            break;
              case 'put':
          case 'patch':
            handlerCode = `
router.${method}('${expressPath}', async (req, res) => {
  logger.info('${method.toUpperCase()} ${expressPath}');
  
  try {
    // Simulate network delay if enabled
    if (serverOptions.delayEnabled) {
      await simulateNetworkDelay(serverOptions.minDelay, serverOptions.maxDelay);
    }
    
    // Extract parameters
    const params = {
      ${pathParams.map(p => `${p}: req.params.${p}`).join(',\n      ')}
    };
    
    const requestBody = req.body;
    
    // Check for special response status
    const responseStatus = getResponseStatus(req);
    if (responseStatus.statusCode >= 400) {
      return res.status(responseStatus.statusCode).json({
        success: false,
        error: getErrorTitle(responseStatus.statusCode),
        message: responseStatus.message || 'An error occurred',
        statusCode: responseStatus.statusCode
      });
    }
    
    // Call the mock service
    const result = await ${instanceName}.${endpoint.operationId}({ ...params, data: requestBody });
    
    // Return wrapped response
    res.json(wrapResponse(result, 'Resource updated successfully'));
  } catch (error) {
    handleError(error, res);
  }
});`;
            break;
              case 'delete':
            handlerCode = `
router.delete('${expressPath}', async (req, res) => {
  logger.info('DELETE ${expressPath}');
  
  try {
    // Simulate network delay if enabled
    if (serverOptions.delayEnabled) {
      await simulateNetworkDelay(serverOptions.minDelay, serverOptions.maxDelay);
    }
    
    // Extract parameters
    const params = {
      ${pathParams.map(p => `${p}: req.params.${p}`).join(',\n      ')}
    };
    
    // Check for special response status
    const responseStatus = getResponseStatus(req);
    if (responseStatus.statusCode >= 400) {
      return res.status(responseStatus.statusCode).json({
        success: false,
        error: getErrorTitle(responseStatus.statusCode),
        message: responseStatus.message || 'An error occurred',
        statusCode: responseStatus.statusCode
      });
    }
    
    // Call the mock service
    await ${instanceName}.${endpoint.operationId}(params);
    
    // For DELETE operations, return 204 No Content or a success message
    res.status(204).json(wrapResponse(null, 'Resource deleted successfully'));
  } catch (error) {
    handleError(error, res);
  }
});`;
            break;
        }
        
        return handlerCode;
      });
    });

    // Create the Express server file content
    return `// Auto-generated Express.js mock API server
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import { faker } from '@faker-js/faker';
import fs from 'fs';
import path from 'path';

${allImports}

/**
 * Standard response wrapper format for successful responses
 */
interface ResponseWrapper<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Paginated response wrapper format for list endpoints
 */
interface PaginatedResponseWrapper<T> {
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

// Create Express app
const app = express();
const port = process.env.PORT || 3001;
const router = express.Router();

// Configure middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Simple logger for requests
const logger = {
  info: (message: string) => console.log('\\x1b[36m%s\\x1b[0m', \`[INFO] \${message}\`),
  error: (message: string) => console.log('\\x1b[31m%s\\x1b[0m', \`[ERROR] \${message}\`),
  warning: (message: string) => console.log('\\x1b[33m%s\\x1b[0m', \`[WARNING] \${message}\`),
  success: (message: string) => console.log('\\x1b[32m%s\\x1b[0m', \`[SUCCESS] \${message}\`)
};

/**
 * Global error handler for Express
 */
function handleError(error: any, res: express.Response) {
  logger.error(\`Error: \${error.message}\`);
  
  // Extract status code from error message if possible
  const statusCodeMatch = error.message.match(/status (\d+)/i);
  let statusCode = 500;
  let errorMessage = 'An unexpected error occurred';
  
  if (statusCodeMatch && statusCodeMatch[1]) {
    statusCode = parseInt(statusCodeMatch[1], 10);
    errorMessage = getErrorMessageForCode(statusCode);
  }
  
  // Return structured error response
  res.status(statusCode).json({
    success: false,
    error: getErrorTitle(statusCode),
    message: errorMessage,
    statusCode
  });
}

// Configure server options
const serverOptions = {
  delayEnabled: true,
  minDelay: 50,
  maxDelay: 300,
  paginate: true,
  wrapResponses: true
};

/**
 * Simulates network latency by waiting a random time
 */
async function simulateNetworkDelay(minMs = 50, maxMs = 300): Promise<void> {
  const delay = Math.random() * (maxMs - minMs) + minMs;
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Extract a status code from request data based on predetermined patterns
 */
function getResponseStatus(req: express.Request): { 
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
    
    // Check for _error field to trigger specific error
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
      }
    }
  }

  // Check query parameters for _status
  if (req.query._status) {
    const statusCode = Number(req.query._status);
    if (!isNaN(statusCode) && statusCode >= 200 && statusCode < 600) {
      return {
        statusCode,
        message: getErrorMessageForCode(statusCode)
      };
    }
  }

  // Check route parameters for special IDs
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
 * Get error message for a status code
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
      return \`Error with status code \${statusCode}\`;
  }
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
    default: return \`Error \${statusCode}\`;
  }
}

/**
 * Wraps success response data in the standard format
 */
function wrapResponse<T>(data: T, message?: string): ResponseWrapper<T> {
  return {
    success: true,
    data,
    message
  };
}

/**
 * Creates a paginated response for list endpoints
 */
function wrapPaginatedResponse<T>(
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
    links.first = \`\${baseUrl}?page=1&perPage=\${perPage}\`;
    links.last = \`\${baseUrl}?page=\${totalPages}&perPage=\${perPage}\`;
    
    if (page > 1) {
      links.prev = \`\${baseUrl}?page=\${page - 1}&perPage=\${perPage}\`;
    }
    
    if (page < totalPages) {
      links.next = \`\${baseUrl}?page=\${page + 1}&perPage=\${perPage}\`;
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

// Home route
router.get('/', (req, res) => {
  res.json({ 
    message: 'Mock API Server is running', 
    documentation: '/api-docs',
    version: '1.0.0',
    endpoints: ${JSON.stringify(
      Object.entries(serviceGroups).flatMap(([service, endpoints]) => 
        endpoints.map(e => `${e.method} ${e.path}`)
      )
    )}
  });
});

// API Documentation route
router.get('/api-docs', (req, res) => {
  res.send(\`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Mock Server Documentation</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 1000px;
        margin: 0 auto;
        padding: 20px;
      }
      h1 { border-bottom: 1px solid #eee; padding-bottom: 10px; }
      h2 { margin-top: 30px; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
      th, td { text-align: left; padding: 8px; border: 1px solid #ddd; }
      th { background-color: #f2f2f2; }
      tr:nth-child(even) { background-color: #f9f9f9; }
      code { background-color: #f5f5f5; padding: 2px 5px; border-radius: 3px; font-family: monospace; }
      pre { background-color: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
    </style>
  </head>
  <body>
    <h1>API Mock Server Documentation</h1>
    <p>This server provides mock endpoints that simulate the real API behavior with fake data.</p>
    
    <h2>Endpoints</h2>
    <table>
      <tr>
        <th>Method</th>
        <th>Path</th>
        <th>Description</th>
      </tr>      ${Object.entries(serviceGroups).flatMap(([service, endpoints]) => 
        endpoints.map(e => 
          `<tr>
            <td><code>${e.method}</code></td>
            <td><code>${e.path}</code></td>
            <td>${e.endpoint.summary || ''}</td>
          </tr>`
        )
      ).join('\\n      ')}
    </table>
    
    <h2>Controlling Responses</h2>
    <p>You can control the server responses in the following ways:</p>
    
    <h3>Status Codes</h3>
    <p>To force specific response codes:</p>
    <ul>
      <li>Include <code>id: 201</code> for Created responses</li>
      <li>Include <code>id: 400</code> for Bad Request errors</li>
      <li>Include <code>id: 401</code> for Unauthorized errors</li>
      <li>Include <code>id: 403</code> for Forbidden errors</li>
      <li>Include <code>id: 404</code> for Not Found errors</li>
      <li>Include <code>id: 500</code> for Server Error responses</li>
    </ul>
    
    <p>Or add a query parameter: <code>?_status=404</code></p>
    
    <h3>Error Types</h3>
    <p>Add an <code>_error</code> field with one of these values:</p>
    <ul>
      <li><code>"VALIDATION"</code> - For validation errors (400)</li>
      <li><code>"UNAUTHORIZED"</code> - For auth errors (401)</li>
      <li><code>"FORBIDDEN"</code> - For permission errors (403)</li>
      <li><code>"NOT_FOUND"</code> - For missing resources (404)</li>
      <li><code>"SERVER_ERROR"</code> - For internal errors (500)</li>
    </ul>
    
    <h3>Pagination</h3>
    <p>For list endpoints, use:</p>
    <ul>
      <li><code>?page=2</code> - To get specific page</li>
      <li><code>?perPage=20</code> - To set page size</li>
    </ul>
    
    <h2>Example</h2>
    <pre>
// Request with error simulation
POST /api/users
{
  "name": "John Doe",
  "email": "john@example.com",
  "_error": "VALIDATION"  // Will trigger a 400 error
}

// Response
{
  "success": false,
  "error": "Bad Request",
  "message": "Validation failed for provided data",
  "statusCode": 400
}
    </pre>
  </body>
  </html>
  \`);
});

// API Routes
${routeHandlers.join('\n\n')}

// Mount router
app.use('/api', router);

// Start server
export function startMockServer() {
  app.listen(port, () => {
    logger.success(\`Mock API server running at http://localhost:\${port}/api\`);
    logger.info('Press CTRL+C to stop');
  });
}

// Auto-start server if running directly
if (process.argv[1] === import.meta.url) {
  startMockServer();
}

export default app;
`;
  }

  /**
   * Generate the response utilities for the mock server
   */
  private generateResponseUtils(): string {
    return `/**
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
    if (req.query && req.query._status) {
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
export function getErrorMessageForCode(statusCode: number): string {
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
      return \`Error with status code \${statusCode}\`;
  }
}

/**
 * Get error title based on status code
 */
export function getErrorTitle(statusCode: number): string {
  switch (statusCode) {
    case 400: return 'Bad Request';
    case 401: return 'Unauthorized';
    case 403: return 'Forbidden';
    case 404: return 'Not Found';
    case 500: return 'Internal Server Error';
    default: return \`Error \${statusCode}\`;
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
    links.first = \`\${baseUrl}?page=1&perPage=\${perPage}\`;
    links.last = \`\${baseUrl}?page=\${totalPages}&perPage=\${perPage}\`;
    
    if (page > 1) {
      links.prev = \`\${baseUrl}?page=\${page - 1}&perPage=\${perPage}\`;
    }
    
    if (page < totalPages) {
      links.next = \`\${baseUrl}?page=\${page + 1}&perPage=\${perPage}\`;
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
  const statusCodeMatch = error?.message?.match(/status (\\d+)/i);
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
}`;
  }
}
