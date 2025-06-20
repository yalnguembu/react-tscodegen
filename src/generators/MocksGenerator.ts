import { BaseGenerator } from '../BaseGenerator.js';
import { FileSystemAPI } from '../FileSystem.js';
import { EndpointInfo, HttpMethod } from '../types.js';

export class MocksGenerator extends BaseGenerator {
  private _generatedMocks: Map<string, string> = new Map();
  private _generatedServer: string = '';
  
  protected getGeneratorKey(): string {
    return 'mocks';
  }

  protected performGeneration(): Map<string, string> {
    return this.generate();
  }

  protected async generateFiles(fs: FileSystemAPI): Promise<void> {
    this.saveFiles(fs);
  }
  
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

## Quick Start

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start the server:
   \`\`\`bash
   npm start
   \`\`\`

3. For development with hot reload:
   \`\`\`bash
   npm run dev
   \`\`\`

The server will start on http://localhost:3001 by default.

## Features

- ✅ Real Express.js server with proper middleware
- ✅ CORS enabled for frontend integration
- ✅ Request/response logging with Morgan
- ✅ In-memory data persistence during session
- ✅ Realistic fake data using faker.js
- ✅ Error simulation capabilities
- ✅ Pagination support
- ✅ Full CRUD operations

## Using the Mock Server

### For E2E Testing
The server provides realistic data that can be used directly in your E2E tests.

### For Development
Point your frontend application to http://localhost:3001 for API calls.

### Error Simulation
- Send requests with ID values like 400, 401, 403, 404, 500 to trigger specific error responses
- Include \`_error: "VALIDATION"\` in request body to simulate validation errors

## Endpoints
The server will display all available endpoints when started.
`;
    fs.writeFile(readmePath, readme);
    
    this.createIndexFile(mocksDir, indexFileContent, fs);
  }

  private generateResponseUtils(): string {
    return `// Response utilities for mock server
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
  status: number;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function createSuccessResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    data,
    message,
    timestamp: new Date().toISOString(),
    status: 200
  };
}

export function createErrorResponse(error: string, status: number = 500): ApiResponse {
  return {
    error,
    timestamp: new Date().toISOString(),
    status
  };
}

export function createPaginatedResponse<T>(
  data: T[], 
  total: number, 
  page: number, 
  limit: number
): PaginatedResponse<T> {
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}
`;
  }

  private generateExpressServer(serviceGroups: Record<string, EndpointInfo[]>): string {
    const serverImports = this.generateServerImports(serviceGroups);
    const middlewareSetup = this.generateMiddlewareSetup();
    const dataStore = this.generateDataStore();
    const routes = this.generateRoutes(serviceGroups);
    const errorHandling = this.generateErrorHandling();

    return `${serverImports}

${dataStore}

${middlewareSetup}

${routes}

${errorHandling}

// Start server
const PORT = process.env.PORT || 3001;

export const startMockServer = (port: number = PORT) => {
  app.listen(port, () => {
    console.log(\`🚀 Mock API server is running on http://localhost:\${port}\`);
    console.log(\`📖 Available endpoints:\`);
    ${this.generateEndpointList(serviceGroups)}
  });
};

// Auto-start if this file is run directly
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  startMockServer();
}
`;
  }

  private generateServerImports(serviceGroups: Record<string, EndpointInfo[]>): string {
    const imports = [
      "import express from 'express';",
      "import cors from 'cors';",
      "import bodyParser from 'body-parser';",
      "import morgan from 'morgan';",
      "import { fileURLToPath } from 'url';",
      "import { dirname, join } from 'path';",
      "import { createSuccessResponse, createErrorResponse, createPaginatedResponse } from './response-utils';"
    ];

    return imports.join('\n');
  }

  private generateMiddlewareSetup(): string {
    return `// Express app setup
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Add delay middleware to simulate network latency
app.use((req, res, next) => {
  const delay = Math.random() * 500 + 100; // 100-600ms delay
  setTimeout(next, delay);
});`;
  }

  private generateDataStore(): string {
    return `// In-memory data store for persistent mock data
class MockDataStore {
  private data: Map<string, any[]> = new Map();
  private idCounters: Map<string, number> = new Map();

  // Initialize with fake data
  init() {
    // Initialize data for each entity type
    this.seedData();
  }

  private seedData() {
    // Add some seed data for common entities
    const entities = ['users', 'seasons', 'categories', 'clubs', 'persons'];
    
    entities.forEach(entityType => {
      const seedData = [];
      for (let i = 1; i <= 10; i++) {
        seedData.push(this.generateSampleData(entityType, i));
      }
      this.data.set(entityType, seedData);
      this.idCounters.set(entityType, 10);
    });
  }

  private generateSampleData(entityType: string, id: number): any {
    const baseData = {
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    switch (entityType) {
      case 'users':
        return {
          ...baseData,
          name: \`User \${id}\`,
          email: \`user\${id}@example.com\`,
          role: ['admin', 'user', 'moderator'][id % 3]
        };
      case 'seasons':
        return {
          ...baseData,
          name: \`Season \${2020 + id}\`,
          startDate: new Date(2020 + id, 0, 1).toISOString().split('T')[0],
          endDate: new Date(2020 + id, 11, 31).toISOString().split('T')[0],
          active: id === 1
        };
      default:
        return {
          ...baseData,
          name: \`\${entityType.slice(0, -1)} \${id}\`,
          description: \`Sample \${entityType.slice(0, -1)} description \${id}\`
        };
    }
  }

  // Generic CRUD operations
  getAll(entityType: string): any[] {
    return this.data.get(entityType) || [];
  }

  getById(entityType: string, id: string | number): any | null {
    const items = this.data.get(entityType) || [];
    return items.find(item => item.id == id) || null;
  }

  create(entityType: string, item: any): any {
    const items = this.data.get(entityType) || [];
    const nextId = (this.idCounters.get(entityType) || 0) + 1;
    this.idCounters.set(entityType, nextId);
    
    const newItem = { 
      ...item, 
      id: nextId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    items.push(newItem);
    this.data.set(entityType, items);
    
    return newItem;
  }

  update(entityType: string, id: string | number, updates: any): any | null {
    const items = this.data.get(entityType) || [];
    const index = items.findIndex(item => item.id == id);
    
    if (index === -1) return null;
    
    const updatedItem = { 
      ...items[index], 
      ...updates,
      updatedAt: new Date().toISOString()
    };
    items[index] = updatedItem;
    this.data.set(entityType, items);
    
    return updatedItem;
  }

  delete(entityType: string, id: string | number): boolean {
    const items = this.data.get(entityType) || [];
    const index = items.findIndex(item => item.id == id);
    
    if (index === -1) return false;
    
    items.splice(index, 1);
    this.data.set(entityType, items);
    
    return true;
  }

  // Pagination support
  getPaginated(entityType: string, page: number = 1, limit: number = 20): any {
    const items = this.data.get(entityType) || [];
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = items.slice(startIndex, endIndex);
    
    return createPaginatedResponse(paginatedItems, items.length, page, limit);
  }
}

const dataStore = new MockDataStore();
dataStore.init();`;
  }

  private generateRoutes(serviceGroups: Record<string, EndpointInfo[]>): string {
    let routes = '// API Routes\n';
    
    Object.entries(serviceGroups).forEach(([serviceName, endpoints]) => {
      routes += `\n// ${serviceName} routes\n`;
      
      endpoints.forEach(endpoint => {
        const method = endpoint.method.toLowerCase();
        const path = this.convertPathToExpress(endpoint.path);
        const handlerCode = this.generateHandlerCode(endpoint);
        
        routes += `app.${method}('${path}', ${handlerCode});\n`;
      });
    });

    return routes;
  }

  private generateHandlerCode(endpoint: EndpointInfo): string {
    const method = endpoint.method.toUpperCase();
    const pathParts = endpoint.path.split('/').filter(part => part && !part.startsWith('{'));
    const entityType = pathParts[pathParts.length - 1] || 'default';
    
    return `async (req, res) => {
  try {
    ${this.generateHandlerBody(endpoint, entityType)}
  } catch (error) {
    console.error('Mock API Error:', error);
    const statusCode = error.message.includes('status') ? 
      parseInt(error.message.match(/status (\\d+)/)?.[1] || '500') : 500;
    res.status(statusCode).json(createErrorResponse(
      error.message || 'Internal server error',
      statusCode
    ));
  }
}`;
  }

  private generateHandlerBody(endpoint: EndpointInfo, entityType: string): string {
    const method = endpoint.method.toUpperCase();

    switch (method) {
      case 'GET':
        if (endpoint.path.includes('{id}')) {
          // GET by ID
          return `const id = req.params.id;
    const item = dataStore.getById('${entityType}', id);
    if (!item) {
      return res.status(404).json(createErrorResponse('Item not found', 404));
    }
    res.json(createSuccessResponse(item));`;
        } else {
          // GET all with pagination
          return `const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = dataStore.getPaginated('${entityType}', page, limit);
    res.json(result);`;
        }
      
      case 'POST':
        return `// Check for error simulation
    if (req.body._error) {
      const errorType = String(req.body._error).toUpperCase();
      if (errorType === 'VALIDATION') {
        return res.status(400).json(createErrorResponse('Validation error', 400));
      }
    }
    
    const newItem = dataStore.create('${entityType}', req.body);
    res.status(201).json(createSuccessResponse(newItem, 'Item created successfully'));`;
      
      case 'PUT':
      case 'PATCH':
        return `const id = req.params.id;
    const updatedItem = dataStore.update('${entityType}', id, req.body);
    if (!updatedItem) {
      return res.status(404).json(createErrorResponse('Item not found', 404));
    }
    res.json(createSuccessResponse(updatedItem, 'Item updated successfully'));`;
      
      case 'DELETE':
        return `const id = req.params.id;
    const deleted = dataStore.delete('${entityType}', id);
    if (!deleted) {
      return res.status(404).json(createErrorResponse('Item not found', 404));
    }
    res.status(204).send();`;
      
      default:
        return `res.json(createSuccessResponse({ message: 'Mock response for ${method} ${endpoint.path}' }));`;
    }
  }

  private convertPathToExpress(path: string): string {
    return path.replace(/{([^}]+)}/g, ':$1');
  }

  private generateErrorHandling(): string {
    return `// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json(createErrorResponse('Internal server error', 500));
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json(createErrorResponse(\`Endpoint not found: \${req.originalUrl}\`, 404));
});`;
  }

  private generateEndpointList(serviceGroups: Record<string, EndpointInfo[]>): string {
    let endpointList = '';
    
    Object.entries(serviceGroups).forEach(([serviceName, endpoints]) => {
      endpoints.forEach(endpoint => {
        const method = endpoint.method.toUpperCase();
        const path = endpoint.path;
        endpointList += `    console.log('  ${method.padEnd(6)} http://localhost:' + port + '${path}');\\n`;
      });
    });

    return endpointList;
  }

  private generateMockServiceFile(serviceName: string, endpoints: EndpointInfo[]): string {
    return `// Mock service for ${serviceName}
// This file contains mock implementations for ${serviceName} endpoints

export class ${serviceName}Mock {
  // Mock methods would go here if needed for individual service mocking
  // The main mock server is in server.ts
}

export const ${serviceName.toLowerCase()}Mock = new ${serviceName}Mock();
`;
  }

  private groupEndpointsByTag(): Record<string, EndpointInfo[]> {
    const groups: Record<string, EndpointInfo[]> = {};
    
    Object.entries(this.spec.paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, endpoint]) => {
        const httpMethod = method.toUpperCase() as HttpMethod;
        const tags = endpoint.tags || ['default'];
        const operationId = (endpoint as any).operationId || `${httpMethod.toLowerCase()}${path.replace(/[{}]/g, '').replace(/\//g, '_')}`;
        
        const endpointInfo: EndpointInfo = {
          path,
          method: httpMethod,
          endpoint,
          operationId
        };
        
        tags.forEach(tag => {
          const serviceName = this.toPascalCase(tag);
          if (!groups[serviceName]) {
            groups[serviceName] = [];
          }
          groups[serviceName].push(endpointInfo);
        });
      });
    });
    
    return groups;
  }
}
