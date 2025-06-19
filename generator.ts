#!/usr/bin/env node
// types/api-spec.ts - API Specification Definition
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Add command line argument parser
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Add Node.js type declarations
/// <reference types="node" />

export interface OpenApiSpec {
  paths: Record<string, Record<string, EndpointDefinition>>;
  components: {
    schemas: Record<string, SchemaDefinition>;
    parameters?: Record<string, ParameterDefinition>;
    responses?: Record<string, ResponseDefinition>;
  };
}

export interface EndpointDefinition {
  tags?: string[];
  summary?: string;
  requestBody?: {
    required: boolean;
    content: {
      'application/json': {
        schema: SchemaReference | SchemaDefinition;
      };
    };
  };
  responses: Record<string, {
    description: string;
    content?: {
      'application/json': {
        schema: SchemaReference | SchemaDefinition;
      };
    };
  }>;
  parameters?: ParameterDefinition[];
}

export interface SchemaDefinition {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  items?: SchemaDefinition;
  enum?: string[];
  format?: string;
}

export interface SchemaReference {
  $ref: string;
}

export interface ParameterDefinition {
  name: string;
  in: 'path' | 'query' | 'header';
  required?: boolean;
  schema: SchemaDefinition;
}

export interface ResponseDefinition {
  description: string;
  content?: {
    'application/json': {
      schema: SchemaDefinition | SchemaReference;
    };
  };
}

// builders/api-contract-builder.ts - Main Contract Builder
export class ApiContractBuilder {
  private spec: OpenApiSpec;
  private _generatedTypes: Map<string, string> = new Map();
  private _generatedSchemas: Map<string, string> = new Map();
  private _generatedServices: Map<string, string> = new Map();
  private basePath: string;

  constructor(spec: OpenApiSpec, basePath: string = './frontend/src') {
    this.spec = spec;
    this.basePath = basePath;
  }
  
  // Getters for accessing stats
  get generatedTypes(): Map<string, string> {
    return this._generatedTypes;
  }
  
  get generatedSchemas(): Map<string, string> {
    return this._generatedSchemas;
  }
  
  get generatedServices(): Map<string, string> {
    return this._generatedServices;
  }

  // Main generation method
  generateAll() {
    // Generate schemas and types first
    this.generateSchemasAndTypes();
    
    // Generate services based on endpoints
    this.generateServices();

    return {
      types: this.generatedTypes,
      schemas: this.generatedSchemas,
      services: this.generatedServices,
    };
  }

  // Save all generated files to disk
  saveAllFiles() {
    this.saveTypes();
    this.saveSchemas();
    this.saveServices();
    
    // Also save view objects
    const viewObjects = this.generateViewObjects();
    this.saveViewObjects(viewObjects);
    
    console.log('All API contract files have been generated successfully!');
  }
    private saveTypes() {
    const typesDir = path.join(this.basePath, 'types');
    this.ensureDirectoryExists(typesDir);
    
    // Create index.ts to re-export all types
    let indexFileContent = '// Auto-generated type definitions from API spec\n\n';
    
    this._generatedTypes.forEach((content, name) => {
      const fileName = `${this.toKebabCase(name)}.ts`;
      const filePath = path.join(typesDir, fileName);
      
      // Write the type file
      fs.writeFileSync(filePath, content, 'utf8');
      
      // Add to index exports
      indexFileContent += `export * from './${this.toKebabCase(name)}';\n`;
    });
    
    // Write the index file
    fs.writeFileSync(path.join(typesDir, 'index.ts'), indexFileContent, 'utf8');
  }
    private saveSchemas() {
    const schemasDir = path.join(this.basePath, 'schemas');
    this.ensureDirectoryExists(schemasDir);
    
    // Create index.ts to re-export all schemas
    let indexFileContent = '// Auto-generated schemas from API spec\nimport { z } from \'zod\';\n\n';
    
    this._generatedSchemas.forEach((content, name) => {
      const fileName = `${this.toKebabCase(name)}.schema.ts`;
      const filePath = path.join(schemasDir, fileName);
      
      // Add import for Zod
      const contentWithImport = 'import { z } from \'zod\';\nimport { ' + name + ' } from \'../types\';\n\n' + content;
      
      // Write the schema file
      fs.writeFileSync(filePath, contentWithImport, 'utf8');
      
      // Add to index exports
      indexFileContent += `export * from './${this.toKebabCase(name)}.schema';\n`;
    });
    
    // Write the index file
    fs.writeFileSync(path.join(schemasDir, 'index.ts'), indexFileContent, 'utf8');
  }
    private saveServices() {
    const servicesDir = path.join(this.basePath, 'services');
    this.ensureDirectoryExists(servicesDir);
    
    // Create index.ts to re-export all services
    let indexFileContent = '// Auto-generated services from API spec\n\n';
    
    this._generatedServices.forEach((content, name) => {
      const fileName = `${this.toKebabCase(name)}.ts`;
      const filePath = path.join(servicesDir, fileName);
      
      // Write the service file
      fs.writeFileSync(filePath, content, 'utf8');
      
      // Add to index exports
      const exportName = name.charAt(0).toLowerCase() + name.slice(1);
      indexFileContent += `export { ${name}, ${exportName} } from './${this.toKebabCase(name)}';\n`;
    });
    
    // Write the index file
    fs.writeFileSync(path.join(servicesDir, 'index.ts'), indexFileContent, 'utf8');
  }
  
  private saveViewObjects(viewObjects: Map<string, string>) {
    const viewsDir = path.join(this.basePath, 'views');
    this.ensureDirectoryExists(viewsDir);
    
    // Create index.ts to re-export all view objects
    let indexFileContent = '// Auto-generated view objects from API spec\n\n';
    
    viewObjects.forEach((content, name) => {
      const fileName = `${this.toKebabCase(name)}.ts`;
      const filePath = path.join(viewsDir, fileName);
      
      // Add imports
      const baseName = name.replace('View', '');
      const contentWithImports = `import { ${baseName} } from '../types';\nimport { ${baseName}Schema } from '../schemas';\n\n${content}`;
      
      // Write the view file
      fs.writeFileSync(filePath, contentWithImports, 'utf8');
      
      // Add to index exports
      indexFileContent += `export * from './${this.toKebabCase(name)}';\n`;
    });
    
    // Write the index file
    fs.writeFileSync(path.join(viewsDir, 'index.ts'), indexFileContent, 'utf8');
  }
  
  // Helper method to ensure a directory exists
  private ensureDirectoryExists(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
  
  // Helper to convert PascalCase to kebab-case for filenames
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z])(?=[a-z])/g, '$1-$2')
      .toLowerCase();
  }
  // Generate TypeScript types and Zod schemas from components.schemas
  private generateSchemasAndTypes() {
    Object.entries(this.spec.components.schemas).forEach(([name, schema]) => {
      const { typeDefinition, zodSchema } = this.generateSchemaAndType(name, schema);
      this._generatedTypes.set(name, typeDefinition);
      this._generatedSchemas.set(name, zodSchema);
    });
  }

  private generateSchemaAndType(name: string, schema: SchemaDefinition): { typeDefinition: string, zodSchema: string } {
    let typeDefinition = '';
    let zodSchema = '';

    switch (schema.type) {
      case 'object':
        const { objectType, objectSchema } = this.generateObjectSchemaAndType(name, schema);
        typeDefinition = objectType;
        zodSchema = objectSchema;
        break;
      
      case 'array':
        const { arrayType, arraySchema } = this.generateArraySchemaAndType(name, schema);
        typeDefinition = arrayType;
        zodSchema = arraySchema;
        break;
      
      default:
        const { primitiveType, primitiveSchema } = this.generatePrimitiveSchemaAndType(schema);
        typeDefinition = `export type ${name} = ${primitiveType};`;
        zodSchema = `export const ${name}Schema = ${primitiveSchema};`;
    }

    return { typeDefinition, zodSchema };
  }

  private generateObjectSchemaAndType(name: string, schema: SchemaDefinition) {
    const properties = schema.properties || {};
    const required = schema.required || [];

    // Generate TypeScript interface
    const typeProps = Object.entries(properties).map(([propName, propSchema]) => {
      const isRequired = required.includes(propName);
      const propType = this.getTypeFromSchema(propSchema);
      return `  ${propName}${isRequired ? '' : '?'}: ${propType};`;
    }).join('\n');

    const objectType = `export interface ${name} {\n${typeProps}\n}`;

    // Generate Zod schema
    const schemaProps = Object.entries(properties).map(([propName, propSchema]) => {
      const isRequired = required.includes(propName);
      const zodType = this.getZodFromSchema(propSchema);
      return `  ${propName}: ${zodType}${isRequired ? '' : '.optional()'}`;
    }).join(',\n');

    const objectSchema = `export const ${name}Schema = z.object({\n${schemaProps}\n});`;

    return { objectType, objectSchema };
  }

  private generateArraySchemaAndType(name: string, schema: SchemaDefinition) {
    const itemType = this.getTypeFromSchema(schema.items!);
    const arrayType = `export type ${name} = ${itemType}[];`;

    const zodItemType = this.getZodFromSchema(schema.items!);
    const arraySchema = `export const ${name}Schema = z.array(${zodItemType});`;

    return { arrayType, arraySchema };
  }

  private generatePrimitiveSchemaAndType(schema: SchemaDefinition) {
    let primitiveType = 'unknown';
    let primitiveSchema = 'z.unknown()';

    switch (schema.type) {
      case 'string':
        primitiveType = 'string';
        if (schema.enum) {
          const enumValues = schema.enum.map(v => `'${v}'`).join(' | ');
          primitiveType = enumValues;
          primitiveSchema = `z.enum([${schema.enum.map(v => `'${v}'`).join(', ')}])`;
        } else if (schema.format === 'email') {
          primitiveSchema = 'z.string().email()';
        } else {
          primitiveSchema = 'z.string()';
        }
        break;
      case 'number':
      case 'integer':
        primitiveType = 'number';
        primitiveSchema = 'z.number()';
        break;
      case 'boolean':
        primitiveType = 'boolean';
        primitiveSchema = 'z.boolean()';
        break;
    }

    return { primitiveType, primitiveSchema };
  }

  private getTypeFromSchema(schema: any): string {
    if (schema.$ref) {
      return this.extractNameFromRef(schema.$ref);
    }

    switch (schema.type) {
      case 'string':
        if (schema.enum) {
          return schema.enum.map((v: string) => `'${v}'`).join(' | ');
        }
        return 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        return `${this.getTypeFromSchema(schema.items)}[]`;
      case 'object':
        return 'Record<string, any>'; // Fallback for inline objects
      default:
        return 'unknown';
    }
  }

  private getZodFromSchema(schema: any): string {
    if (schema.$ref) {
      const name = this.extractNameFromRef(schema.$ref);
      return `${name}Schema`;
    }

    switch (schema.type) {
      case 'string':
        if (schema.enum) {
          return `z.enum([${schema.enum.map((v: string) => `'${v}'`).join(', ')}])`;
        }
        if (schema.format === 'email') {
          return 'z.string().email()';
        }
        return 'z.string()';
      case 'number':
      case 'integer':
        return 'z.number()';
      case 'boolean':
        return 'z.boolean()';
      case 'array':
        return `z.array(${this.getZodFromSchema(schema.items)})`;
      case 'object':
        return 'z.record(z.any())'; // Fallback for inline objects
      default:
        return 'z.unknown()';
    }
  }

  private extractNameFromRef(ref: string): string {
    return ref.split('/').pop() || 'Unknown';
  }

  // Generate services based on endpoints
  private generateServices() {
    const serviceGroups = this.groupEndpointsByTag();
    
    Object.entries(serviceGroups).forEach(([serviceName, endpoints]) => {
      const serviceCode = this.generateServiceClass(serviceName, endpoints);
      this.generatedServices.set(serviceName, serviceCode);
    });
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
    const pathParts = path.split('/').filter(part => part && !part.startsWith('{'));
    const operation = method.toLowerCase();
    const resource = pathParts[pathParts.length - 1] || 'resource';
    
    // Convert to camelCase
    return `${operation}${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
  }

  private generateServiceClass(serviceName: string, endpoints: EndpointInfo[]): string {
    const imports = this.generateServiceImports(endpoints);
    const methods = endpoints.map(endpoint => this.generateServiceMethod(endpoint)).join('\n\n  ');

    return `${imports}

export class ${serviceName} {
  constructor(private apiClient: ApiClient) {}

  ${methods}
}

export const ${serviceName.toLowerCase()} = new ${serviceName}(apiClient);`;
  }

  private generateServiceImports(endpoints: EndpointInfo[]): string {
    const imports = new Set<string>();
    imports.add("import { ApiClient, ApiResponse } from '../api-client';");
    
    endpoints.forEach(endpoint => {
      // Add request/response type imports
      const requestType = this.getRequestTypeFromEndpoint(endpoint.endpoint);
      const responseType = this.getResponseTypeFromEndpoint(endpoint.endpoint);
      
      if (requestType) imports.add(`import { ${requestType} } from '../types';`);
      if (responseType) imports.add(`import { ${responseType} } from '../types';`);
    });

    return Array.from(imports).join('\n');
  }
  private generateServiceMethod(endpoint: EndpointInfo): string {
    const { operationId, method, path, endpoint: endpointDef } = endpoint;
    
    const pathParams = this.extractPathParameters(path);
    const requestType = this.getRequestTypeFromEndpoint(endpointDef);
    const responseType = this.getResponseTypeFromEndpoint(endpointDef);
    
    // Generate method parameters
    const params: string[] = [];
    
    // Add path parameters
    pathParams.forEach(param => {
      params.push(`${param}: number`); // Assuming ID parameters are numbers
    });
    
    // Add request body parameter
    if (requestType) {
      params.push(`data: ${requestType}`);
    }

    // Add options parameter
    params.push('options: RequestOptions = {}');

    const paramString = params.join(', ');
    const returnType = responseType ? `ApiResponse<${responseType}>` : 'ApiResponse<void>';

    // Generate method body
    let urlPath = path;
    pathParams.forEach(param => {
      urlPath = urlPath.replace(`{${param}}`, `\${${param}}`);
    });

    const methodBody = this.generateMethodBody(method, urlPath, !!requestType);

    return `/**
   * ${endpointDef.summary || `${method} ${path}`}
   */
  async ${operationId}(${paramString}): Promise<${returnType}> {
    ${methodBody}
  }`;
  }

  private generateMethodBody(method: HttpMethod, path: string, hasRequestBody: boolean): string {
    const dataParam = hasRequestBody ? ', data' : '';
    
    switch (method) {
      case 'GET':
        return `return await this.apiClient.get(\`${path}\`, options);`;
      case 'POST':
        return `return await this.apiClient.post(\`${path}\`${dataParam}, options);`;
      case 'PUT':
        return `return await this.apiClient.put(\`${path}\`${dataParam}, options);`;
      case 'DELETE':
        return `return await this.apiClient.delete(\`${path}\`, options);`;
      case 'PATCH':
        return `return await this.apiClient.patch(\`${path}\`${dataParam}, options);`;
      default:
        return `throw new Error('Unsupported HTTP method: ${method}');`;
    }
  }

  private extractPathParameters(path: string): string[] {
    const matches = path.match(/\{([^}]+)\}/g);
    return matches ? matches.map(match => match.slice(1, -1)) : [];
  }

  private getRequestTypeFromEndpoint(endpoint: EndpointDefinition): string | null {
    const requestBody = endpoint.requestBody?.content?.['application/json']?.schema;
    if (!requestBody) return null;
    
    if ('$ref' in requestBody) {
      return this.extractNameFromRef(requestBody.$ref);
    }
    
    return null;
  }

  private getResponseTypeFromEndpoint(endpoint: EndpointDefinition): string | null {
    const successResponse = endpoint.responses['200'] || endpoint.responses['201'];
    const responseSchema = successResponse?.content?.['application/json']?.schema;
    
    if (!responseSchema) return null;
    
    if ('$ref' in responseSchema) {
      return this.extractNameFromRef(responseSchema.$ref);
    }
    
    return null;
  }

  // Generate View Objects for safe data display
  generateViewObjects() {
    const viewObjects = new Map<string, string>();
    
    Object.entries(this.spec.components.schemas).forEach(([name, schema]) => {
      const viewObject = this.generateViewObject(name, schema);
      viewObjects.set(`${name}View`, viewObject);
    });

    return viewObjects;
  }

  private generateViewObject(name: string, schema: SchemaDefinition): string {
    if (schema.type !== 'object') return '';

    const properties = schema.properties || {};
    const viewMethods = Object.entries(properties).map(([propName, propSchema]) => {
      return this.generateViewMethod(propName, propSchema);
    }).join('\n\n  ');

    return `export class ${name}View {
  constructor(private data: ${name}) {}

  ${viewMethods}

  // Safe getter for the entire object
  get safeData(): Partial<${name}> {
    try {
      return { ...this.data };
    } catch {
      return {};
    }
  }

  // Check if data is valid
  get isValid(): boolean {
    return ${name}Schema.safeParse(this.data).success;
  }
}`;
  }

  private generateViewMethod(propName: string, propSchema: any): string {
    const returnType = this.getTypeFromSchema(propSchema);
    const isArray = propSchema.type === 'array';
    const isObject = propSchema.type === 'object' || propSchema.$ref;

    let defaultValue = 'undefined';
    if (isArray) defaultValue = '[]';
    else if (propSchema.type === 'string') defaultValue = "''";
    else if (propSchema.type === 'number') defaultValue = '0';
    else if (propSchema.type === 'boolean') defaultValue = 'false';

    return `get ${propName}(): ${returnType} | ${typeof defaultValue === 'string' && defaultValue !== 'undefined' ? typeof defaultValue : 'undefined'} {
    try {
      return this.data?.${propName} ?? ${defaultValue};
    } catch {
      return ${defaultValue};
    }
  }`;
  }
}

// Supporting types and interfaces
interface EndpointInfo {
  path: string;
  method: HttpMethod;
  endpoint: EndpointDefinition;
  operationId: string;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
}

// Example usage and demo
export function createApiFromSpec(spec: OpenApiSpec, basePath?: string, saveFiles: boolean = false) {
  const builder = new ApiContractBuilder(spec, basePath);
  const generated = builder.generateAll();
  
  // Optionally save files to disk
  if (saveFiles) {
    builder.saveAllFiles();
  }
  
  const viewObjects = builder.generateViewObjects();

  return {
    types: generated.types,
    schemas: generated.schemas,
    services: generated.services,
    viewObjects,
  };
}

// Demo: Example OpenAPI spec for your authentication system
export const exampleApiSpec: OpenApiSpec = {
  paths: {
    '/login': {
      post: {
        tags: ['Authentication'],
        summary: 'User Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' }
              }
            }
          },
          '422': {
            description: 'Validation failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationError' }
              }
            }
          }
        }
      }
    },
    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          '200': {
            description: 'User found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      LoginRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        },
        required: ['email', 'password']
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          full_name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          status: { 
            type: 'string', 
            enum: ['active', 'inactive', 'suspended'] 
          },
          roles: {
            type: 'array',
            items: { $ref: '#/components/schemas/Role' }
          }
        },
        required: ['id', 'full_name', 'email', 'status', 'roles']
      },
      Role: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          display_name: { type: 'string' },
          permissions: {
            type: 'array',
            items: { $ref: '#/components/schemas/Permission' }
          }
        },
        required: ['id', 'name', 'display_name', 'permissions']
      },
      Permission: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          display_name: { type: 'string' },
          permission_group: { type: 'string' }
        },
        required: ['id', 'name', 'display_name', 'permission_group']
      },
      ValidationError: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          errors: {
            type: 'object',
            additionalProperties: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        required: ['message', 'errors']
      }
    }
  }
};

// CLI Implementation
async function main() {
  // Parse command line arguments
  const argv = await yargs(hideBin(process.argv))
    .usage('Usage: $0 --spec <path-to-spec-file> --outDir <output-directory>')
    .options({
      spec: {
        alias: 's',
        describe: 'Path to the OpenAPI specification file (YAML or JSON)',
        type: 'string',
        demandOption: true
      },
      outDir: {
        alias: 'o',
        describe: 'Output directory for generated files',
        type: 'string',
        default: './frontend/src'
      },
      verbose: {
        alias: 'v',
        describe: 'Show verbose output',
        type: 'boolean',
        default: false
      }
    })
    .example('$0 --spec api-specification.yaml --outDir ./frontend/src', 'Generate API contract from the given spec')
    .help()
    .argv;

  try {
    // Load spec file
    const specFile = path.resolve(process.cwd(), argv.spec);
    if (!fs.existsSync(specFile)) {
      console.error(`Error: Specification file not found: ${specFile}`);
      process.exit(1);
    }

    const fileContents = fs.readFileSync(specFile, 'utf8');
    
    // Parse spec file based on extension
    let spec: OpenApiSpec;
    if (specFile.endsWith('.yaml') || specFile.endsWith('.yml')) {
      spec = yaml.load(fileContents) as OpenApiSpec;
    } else if (specFile.endsWith('.json')) {
      spec = JSON.parse(fileContents);
    } else {
      console.error('Error: Specification file must be YAML or JSON');
      process.exit(1);
    }

    // Normalize output directory path
    const outDir = path.resolve(process.cwd(), argv.outDir);
    
    if (argv.verbose) {
      console.log(`Loading spec from: ${specFile}`);
      console.log(`Generating files in: ${outDir}`);
    }

    // Generate the API contract
    const builder = new ApiContractBuilder(spec, outDir);
    builder.generateAll();
    builder.saveAllFiles();
    
    console.log(`✅ API contract generated successfully!`);
    console.log(`📁 Output directory: ${outDir}`);
    console.log(`📊 Generated:`);
    console.log(`   - ${builder.generatedTypes.size} types`);
    console.log(`   - ${builder.generatedSchemas.size} schemas`);
    console.log(`   - ${builder.generatedServices.size} services`);
    
  } catch (error) {
    console.error('Error generating API contract:');
    console.error(error);
    process.exit(1);
  }
}

// Run the CLI if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}