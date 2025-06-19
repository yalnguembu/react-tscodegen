import { z } from 'zod';
import { FileSystemAPI } from './file-system.js';

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

export interface EndpointInfo {
  path: string;
  method: HttpMethod;
  endpoint: EndpointDefinition;
  operationId: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export interface GeneratorOptions {
  generateHooks?: boolean;
  generateComponents?: boolean;
  hooksPath?: string;
  componentsPath?: string;
}

export class ApiContractBuilder {
  private spec: OpenApiSpec;
  private _generatedTypes: Map<string, string> = new Map();
  private _generatedSchemas: Map<string, string> = new Map();
  private _generatedServices: Map<string, string> = new Map();
  private _generatedViews: Map<string, string> = new Map();
  private _generatedHooks: Map<string, string> = new Map();
  private _generatedComponents: Map<string, string> = new Map();
  private basePath: string;
  private options: GeneratorOptions;
  constructor(spec: OpenApiSpec, basePath: string = './frontend/src', options: GeneratorOptions = {}) {
    this.spec = spec;
    this.basePath = basePath;
    this.options = options;
  }

  // Getters for generated content
  get generatedTypes(): Map<string, string> {
    return this._generatedTypes;
  }

  get generatedSchemas(): Map<string, string> {
    return this._generatedSchemas;
  }

  get generatedServices(): Map<string, string> {
    return this._generatedServices;
  }  get generatedViews(): Map<string, string> {
    return this._generatedViews;
  }

  get generatedHooks(): Map<string, string> {
    return this._generatedHooks;
  }

  get generatedComponents(): Map<string, string> {
    return this._generatedComponents;
  }
  
  // Generate view objects (helper classes for client-side data manipulation)
  private generateViewObjects(): Map<string, string> {
    const views = new Map<string, string>();
    
    // Process each schema to create view objects
    Object.entries(this.spec.components.schemas).forEach(([name, schema]) => {
      if (schema.type === 'object' && !name.endsWith('View') && !name.includes('Error')) {
        const viewCode = this.generateViewClass(name, schema);
        views.set(`${name}View`, viewCode);
      }
    });
    
    return views;
  }

  // Generate a view class for a schema
  private generateViewClass(name: string, schema: SchemaDefinition): string {
    return `export class ${name}View {
  constructor(private data: ${name}) {}
  
  // Get the raw data
  get raw(): ${name} {
    return this.data;
  }
  
  // Get a clone of the data
  clone(): ${name} {
    return JSON.parse(JSON.stringify(this.data));
  }
  
  // Create a new view from raw data
  static fromData(data: ${name}): ${name}View {
    return new ${name}View(data);
  }
  
  // Create a new view from a partial object
  static create(data: Partial<${name}>): ${name}View {
    // Validate with zod schema
    const validated = ${name}Schema.parse(data);
    return new ${name}View(validated);
  }
}`;
  }
  
  // Main generation method
  generateAll() {
    // Generate schemas and types first
    this.generateSchemasAndTypes();
    
    // Generate services based on endpoints
    this.generateServices();
    
    // Generate view objects
    this._generatedViews = this.generateViewObjects();

    // Conditionally generate hooks
    if (this.options.generateHooks) {
      this.generateHooks();
    }

    // Conditionally generate components
    if (this.options.generateComponents) {
      this.generateComponents();
    }

    return {
      types: this._generatedTypes,
      schemas: this._generatedSchemas,
      services: this._generatedServices,
      views: this._generatedViews,
      hooks: this._generatedHooks,
      components: this._generatedComponents
    };
  }  saveAllFiles(fs: FileSystemAPI) {
    this.saveTypes(fs);
    this.saveSchemas(fs);
    this.saveServices(fs);
    this.saveViewObjects(this._generatedViews, fs);
    
    if (this.options.generateHooks && this._generatedHooks.size > 0) {
      const hooksDir = this.options.hooksPath || fs.joinPath(this.basePath, 'hooks');
      this.saveGeneratedFiles(this._generatedHooks, hooksDir, '.ts', fs);
      console.log(`Generated ${this._generatedHooks.size} hook files in ${hooksDir}`);
    }
    
    if (this.options.generateComponents && this._generatedComponents.size > 0) {
      const componentsBasePath = this.options.componentsPath || fs.joinPath(this.basePath, 'components');
      
      const formsDir = fs.joinPath(componentsBasePath, 'forms');
      const listsDir = fs.joinPath(componentsBasePath, 'lists');
      fs.ensureDirectoryExists(formsDir);
      fs.ensureDirectoryExists(listsDir);
      
      let formsCount = 0;
      let listsCount = 0;
      
      this._generatedComponents.forEach((content, name) => {
        if (name.endsWith('List')) {
          const fileName = `${this.toKebabCase(name)}.tsx`;
          const filePath = fs.joinPath(listsDir, fileName);
          fs.writeFile(filePath, content);
          listsCount++;
        } else if (name.endsWith('CreateForm') || name.endsWith('EditForm')) {
          const fileName = `${this.toKebabCase(name)}.tsx`;
          const filePath = fs.joinPath(formsDir, fileName);
          fs.writeFile(filePath, content);
          formsCount++;
        }
      });
      
      this.createIndexFile(formsDir, 'forms', fs);
      this.createIndexFile(listsDir, 'lists', fs);
      // Create main components index
      const mainIndexContent = '// Auto-generated components from API spec\n\nexport * from \'./forms\';\nexport * from \'./lists\';\n';
      fs.writeFile(fs.joinPath(componentsBasePath, 'index.ts'), mainIndexContent);
      
      console.log(`Generated ${formsCount} form components and ${listsCount} list components`);
    }
    
    console.log('All API contract files have been generated successfully!');
  }
  
  // Helper method to save a collection of generated files
  private saveGeneratedFiles(files: Map<string, string>, directory: string, extension: string, fs: FileSystemAPI) {
    fs.ensureDirectoryExists(directory);
    
    // Create index.ts to re-export all files
    let indexFileContent = '// Auto-generated files from API spec\n\n';
    
    files.forEach((content, name) => {
      const fileName = `${this.toKebabCase(name)}${extension}`;
      const filePath = fs.joinPath(directory, fileName);
      
      // Write the file
      fs.writeFile(filePath, content);
      
      // Add to index exports
      indexFileContent += `export * from './${this.toKebabCase(name)}';\n`;
    });
    
    // Write the index file
    fs.writeFile(fs.joinPath(directory, 'index.ts'), indexFileContent);
  }
    // Helper method to create an index file for a directory
  private createIndexFile(directory: string, name: string, fs: FileSystemAPI) {
    // If readDirectory is available, use it to list files in the directory
    const files = fs.readDirectory ? fs.readDirectory(directory) : [];
    let indexContent = `// Auto-generated ${name} from API spec\n\n`;
      if (files && files.length > 0) {
      files.forEach((file: string) => {
        if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          const baseName = file.replace(/\.(tsx|ts)$/, '');
          indexContent += `export * from './${baseName}';\n`;
        }
      });
    }
    
    fs.writeFile(fs.joinPath(directory, 'index.ts'), indexContent);
  }
    private saveTypes(fs: FileSystemAPI) {
    const typesDir = fs.joinPath(this.basePath, 'types');
    fs.ensureDirectoryExists(typesDir);
    
    let indexFileContent = '// Auto-generated type definitions from API spec\n\n';
    
    this._generatedTypes.forEach((content, name) => {
      const fileName = `${this.toKebabCase(name)}.ts`;
      const filePath = fs.joinPath(typesDir, fileName);
      fs.writeFile(filePath, content);
      
      // Add to index exports
      indexFileContent += `export * from './${this.toKebabCase(name)}';\n`;
    });
    
    // Write the index file
    fs.writeFile(fs.joinPath(typesDir, 'index.ts'), indexFileContent);
  }
    private saveSchemas(fs: FileSystemAPI) {
    const schemasDir = fs.joinPath(this.basePath, 'schemas');
    fs.ensureDirectoryExists(schemasDir);
    
    let indexFileContent = '// Auto-generated schemas from API spec\nimport { z } from \'zod\';\n\n';
    
    this._generatedSchemas.forEach((content, name) => {
      const fileName = `${this.toKebabCase(name)}.schema.ts`;
      const filePath = fs.joinPath(schemasDir, fileName);
      
      const contentWithImport = 'import { z } from \'zod\';\nimport { ' + name + ' } from \'../types\';\n\n' + content;
      
      fs.writeFile(filePath, contentWithImport);
      
      indexFileContent += `export * from './${this.toKebabCase(name)}.schema';\n`;
    });
    
    fs.writeFile(fs.joinPath(schemasDir, 'index.ts'), indexFileContent);
  }
    private saveServices(fs: FileSystemAPI) {
    const servicesDir = fs.joinPath(this.basePath, 'services');
    fs.ensureDirectoryExists(servicesDir);
    
    let indexFileContent = '// Auto-generated services from API spec\n\n';
    
    this._generatedServices.forEach((content, name) => {
      const fileName = `${this.toKebabCase(name)}.ts`;
      const filePath = fs.joinPath(servicesDir, fileName);
      
      fs.writeFile(filePath, content);
      
      const exportName = name.charAt(0).toLowerCase() + name.slice(1);
      indexFileContent += `export { ${name}, ${exportName} } from './${this.toKebabCase(name)}';\n`;
    });
    
    fs.writeFile(fs.joinPath(servicesDir, 'index.ts'), indexFileContent);
  }
    private saveViewObjects(viewObjects: Map<string, string>, fs: FileSystemAPI) {
    const viewsDir = fs.joinPath(this.basePath, 'views');
    fs.ensureDirectoryExists(viewsDir);
    
    let indexFileContent = '// Auto-generated view objects from API spec\n\n';
    
    viewObjects.forEach((content, name) => {
      const fileName = `${this.toKebabCase(name)}.ts`;
      const filePath = fs.joinPath(viewsDir, fileName);
      
      const baseName = name.replace('View', '');
      const contentWithImports = `import { ${baseName} } from '../types';\nimport { ${baseName}Schema } from '../schemas';\n\n${content}`;
      
      fs.writeFile(filePath, contentWithImports);
      
      indexFileContent += `export * from './${this.toKebabCase(name)}';\n`;
    });
    
    fs.writeFile(fs.joinPath(viewsDir, 'index.ts'), indexFileContent);
  }
    private saveHooks(fs: FileSystemAPI) {
    const hooksDir = fs.joinPath(this.basePath, 'hooks');
    fs.ensureDirectoryExists(hooksDir);
    
    let indexFileContent = '// Auto-generated React Query hooks from API spec\n\n';
    
    this._generatedHooks.forEach((content, name) => {
      const fileName = `${this.toKebabCase(name)}.ts`;
      const filePath = fs.joinPath(hooksDir, fileName);
      
      fs.writeFile(filePath, content);
      
      indexFileContent += `export * from './${this.toKebabCase(name)}';\n`;
    });
    
    fs.writeFile(fs.joinPath(hooksDir, 'index.ts'), indexFileContent);
    
    console.log(`Generated ${this._generatedHooks.size} API hooks files.`);
  }

  private saveComponents(fs: FileSystemAPI) {
    const componentsDir = fs.joinPath(this.basePath, 'components');
    fs.ensureDirectoryExists(componentsDir);
    
    // Create subdirectories for forms and lists
    const formsDir = fs.joinPath(componentsDir, 'forms');
    const listsDir = fs.joinPath(componentsDir, 'lists');
    fs.ensureDirectoryExists(formsDir);
    fs.ensureDirectoryExists(listsDir);
    
    // Create index files
    let formsIndexContent = '// Auto-generated form components from API spec\n\n';
    let listsIndexContent = '// Auto-generated list components from API spec\n\n';
    
    // Process each component and save to appropriate directory
    this._generatedComponents.forEach((content, name) => {
      if (name.endsWith('List')) {
        // Save list component
        const fileName = `${this.toKebabCase(name)}.tsx`;
        const filePath = fs.joinPath(listsDir, fileName);
        fs.writeFile(filePath, content);
        
        // Add to lists index
        listsIndexContent += `export * from './${this.toKebabCase(name)}';\n`;
      } else if (name.endsWith('CreateForm') || name.endsWith('EditForm')) {
        // Save form component
        const fileName = `${this.toKebabCase(name)}.tsx`;
        const filePath = fs.joinPath(formsDir, fileName);
        fs.writeFile(filePath, content);
        
        // Add to forms index
        formsIndexContent += `export * from './${this.toKebabCase(name)}';\n`;
      }
    });
    
    // Write the index files
    fs.writeFile(fs.joinPath(formsDir, 'index.ts'), formsIndexContent);
    fs.writeFile(fs.joinPath(listsDir, 'index.ts'), listsIndexContent);
    
    // Create a main components index
    const mainIndexContent = `// Auto-generated components from API spec\n\n
export * from './forms';\nexport * from './lists';\n`;
    fs.writeFile(fs.joinPath(componentsDir, 'index.ts'), mainIndexContent);
    
    console.log(`Generated ${this._generatedComponents.size} React components.`);
  }
  // Helper to convert PascalCase to kebab-case for filenames
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z])(?=[a-z])/g, '$1-$2')
      .toLowerCase();  }
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
      this._generatedServices.set(serviceName, serviceCode);
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

    // No options parameter - will be handled internally by the API client

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
        return `return await this.apiClient.get(\`${path}\`);`;
      case 'POST':
        return `return await this.apiClient.post(\`${path}\`${dataParam});`;
      case 'PUT':
        return `return await this.apiClient.put(\`${path}\`${dataParam});`;
      case 'DELETE':
        return `return await this.apiClient.delete(\`${path}\`);`;
      case 'PATCH':
        return `return await this.apiClient.patch(\`${path}\`${dataParam});`;
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
    
    return null;  }
  
  // Generate React hooks for API services
  private generateHooks() {
    this._generatedServices.forEach((serviceCode, serviceName) => {
      const hookCode = this.generateHooksForService(serviceName, serviceCode);
      if (hookCode) {
        this._generatedHooks.set(`${serviceName.replace('Service', '')}Hooks`, hookCode);
      }
    });
    
    return this._generatedHooks;
  }
  
  private generateHooksForService(serviceName: string, serviceCode: string): string {
    // Extract the endpoints from the service code
    const regex = /async\s+(\w+)\(([^)]*)\)[^{]*{[^}]*}/g;
    const matches = Array.from(serviceCode.matchAll(regex));
    
    if (!matches.length) {
      return '';
    }
    
    const resourceName = serviceName.replace('Service', '');
    const serviceLower = serviceName.charAt(0).toLowerCase() + serviceName.slice(1);
    const serviceFile = this.toKebabCase(serviceName);
    
    // Generate imports
    let importedTypes = new Set<string>();
    matches.forEach(match => {      const methodName = match[1];
      importedTypes.add(resourceName);
    });
    
    let hookImports = `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';\n`;
    hookImports += `import { ${Array.from(importedTypes).join(', ')} } from '../types';\n`;
    hookImports += `import { ${serviceName}, ${serviceLower} } from '../services/${serviceFile}';\n\n`;
      let hookFunctions = '';
    
    matches.forEach(match => {
      const methodName = match[1];
      const params = match[2];
      
      // Determine if it's a query or mutation based on method name
      if (methodName.startsWith('get') || methodName.startsWith('list') || methodName.startsWith('find')) {
        // It's a query (read operation)
        hookFunctions += this.generateQueryHook(resourceName, serviceLower, methodName, params);
      } else {
        // It's a mutation (write operation)
        hookFunctions += this.generateMutationHook(resourceName, serviceLower, methodName, params);
      }
    });
    
    return `${hookImports}\n${hookFunctions}`;
  }
  
  private generateQueryHook(resourceName: string, serviceName: string, methodName: string, params: string): string {
    const hasParams = params.trim().length > 0;
    const camelCaseMethodName = methodName.charAt(0).toUpperCase() + methodName.slice(1);
    
    let queryTemplate = `
/**
 * Hook for ${methodName} operation
 */
export function use${camelCaseMethodName}(${hasParams ? `${params}, ` : ''}options = {}) {
  return useQuery({
    queryKey: ['${resourceName}', '${methodName}'${hasParams ? ', params' : ''}],
    queryFn: () => ${serviceName}.${methodName}(${hasParams ? params.split(',').map(p => p.split(':')[0].trim()).join(', ') : ''}),
    ...options
  });
}
`;
    
    return queryTemplate;
  }
  
  private generateMutationHook(resourceName: string, serviceName: string, methodName: string, params: string): string {
    const camelCaseMethodName = methodName.charAt(0).toUpperCase() + methodName.slice(1);
    
    let mutationTemplate = `
/**
 * Hook for ${methodName} operation
 */
export function use${camelCaseMethodName}(options = {}) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (${params}) => ${serviceName}.${methodName}(${params.split(',').map(p => p.split(':')[0].trim()).join(', ')}),
    onSuccess: () => {
      // Invalidate related queries after mutation
      queryClient.invalidateQueries({ queryKey: ['${resourceName}'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      options?.onError?.(error);
    }
  });
}
`;    
    return mutationTemplate;
  }
  
  private generateComponents() {    Object.entries(this.spec.components.schemas).forEach(([name, schema]) => {
      if (
        schema.type === 'object' && 
        !name.endsWith('View') && 
        !name.endsWith('Error') && 
        !name.includes('Response')
      ) {
        const createFormCode = this.generateCreateFormComponent(name, schema);
        this._generatedComponents.set(`${name}CreateForm`, createFormCode);
        
        const editFormCode = this.generateEditFormComponent(name, schema);
        this._generatedComponents.set(`${name}EditForm`, editFormCode);
        
        const listCode = this.generateListComponent(name, schema);
        this._generatedComponents.set(`${name}List`, listCode);
      }
    });
    
    return this._generatedComponents;
  }
    private generateCreateFormComponent(name: string, schema: SchemaDefinition): string {
    const properties = schema.properties || {};
    const required = schema.required || [];
    
    const formFields = Object.entries(properties).map(([propName, propSchema]) => {
      const isRequired = required.includes(propName);
      return this.generateFormField(propName, propSchema, isRequired);
    }).join('\n      ');
    
    const defaultValues = Object.entries(properties).map(([propName, propSchema]) => {
      return `      ${propName}: undefined,`;
    }).join('\n');
    
    // Create form component template
    const createFormTemplate = `import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ${name}Schema } from '../schemas/${this.toKebabCase(name)}.schema';
import { ${name} } from '../types';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface ${name}CreateFormProps {
  onSubmit: (data: ${name}) => void;
  isLoading?: boolean;
}

export function ${name}CreateForm({ onSubmit, isLoading = false }: ${name}CreateFormProps) {
  const form = useForm<${name}>({
    resolver: zodResolver(${name}Schema),
    defaultValues: {
${defaultValues}
    }
  });

  const handleSubmit = form.handleSubmit((data) => {
    onSubmit(data);
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        ${formFields}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create ${this.humanize(name)}'}
        </Button>
      </form>
    </Form>
  );
}`;

    return createFormTemplate;
  }
  
  private generateEditFormComponent(name: string, schema: SchemaDefinition): string {
    const properties = schema.properties || {};
    const required = schema.required || [];
    
    // Generate form fields based on properties
    const formFields = Object.entries(properties).map(([propName, propSchema]) => {
      const isRequired = required.includes(propName);
      return this.generateFormField(propName, propSchema, isRequired);
    }).join('\n      ');
    
    // Create edit form component template
    const editFormTemplate = `import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ${name}Schema } from '../schemas/${this.toKebabCase(name)}.schema';
import { ${name} } from '../types';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface ${name}EditFormProps {
  data: ${name};
  onSubmit: (data: ${name}) => void;
  isLoading?: boolean;
}

export function ${name}EditForm({ data, onSubmit, isLoading = false }: ${name}EditFormProps) {
  const form = useForm<${name}>({
    resolver: zodResolver(${name}Schema),
    defaultValues: data
  });

  // Update form when data changes
  useEffect(() => {
    if (data) {
      form.reset(data);
    }
  }, [form, data]);

  const handleSubmit = form.handleSubmit((formData) => {
    onSubmit(formData);
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        ${formFields}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Update ${this.humanize(name)}'}
        </Button>
      </form>
    </Form>
  );
}`;

    return editFormTemplate;
  }
  
  private generateListComponent(name: string, schema: SchemaDefinition): string {
    const properties = schema.properties || {};
    
    // Generate table columns based on properties
    const tableColumns = Object.entries(properties)
      .slice(0, 5) // Limit to 5 columns for readability
      .map(([propName, propSchema]) => {
        return `<td className="px-4 py-2">{item.${propName}}</td>`;
      }).join('\n            ');
    
    // Generate table headers
    const tableHeaders = Object.entries(properties)
      .slice(0, 5) // Limit to 5 columns 
      .map(([propName]) => {
        return `<th className="px-4 py-2">${this.humanize(propName)}</th>`;
      }).join('\n          ');
    
    // Create list component template
    const listTemplate = `import { useState } from 'react';
import { ${name} } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ${name}ListProps {
  data: ${name}[];
  isLoading?: boolean;
  onEdit?: (item: ${name}) => void;
  onDelete?: (item: ${name}) => void;
  onPageChange?: (page: number) => void;
  totalPages?: number;
  currentPage?: number;
}

export function ${name}List({ 
  data, 
  isLoading = false,
  onEdit,
  onDelete,
  onPageChange,
  totalPages = 1,
  currentPage = 1
}: ${name}ListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Handle filtering data if needed
  const filteredData = searchQuery 
    ? data.filter(item => 
        Object.values(item).some(
          value => value && String(value).toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : data;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">${this.humanize(name)} List</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-4">Loading...</div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <table className="min-w-full divide-y">
            <thead className="bg-muted">
              <tr>
                ${tableHeaders}
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No ${this.humanize(name).toLowerCase()} found.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id || Math.random()}>
                    ${tableColumns}
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        {onEdit && (
                          <Button size="sm" variant="outline" onClick={() => onEdit(item)}>
                            Edit
                          </Button>
                        )}
                        {onDelete && (
                          <Button size="sm" variant="destructive" onClick={() => onDelete(item)}>
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          <span className="px-4 py-2">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}`;

    return listTemplate;
  }
  
  private generateFormField(propName: string, propSchema: any, isRequired: boolean): string {
    const fieldType = this.getFieldTypeFromSchema(propSchema);
    const displayName = this.humanize(propName);
    
    // Basic input field template
    return `<FormField
          control={form.control}
          name="${propName}"
          render={({ field }) => (
            <FormItem>
              <FormLabel>${displayName}</FormLabel>
              <FormControl>
                <Input 
                  placeholder="${displayName}"
                  {...field} 
                  type="${fieldType}"
                  required={${isRequired}}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />`;
  }
  
  private getFieldTypeFromSchema(schema: any): string {
    if (schema.$ref) {
      return 'text'; // Default for complex types
    }

    switch (schema.type) {
      case 'string':
        if (schema.format === 'email') return 'email';
        if (schema.format === 'date') return 'date';
        if (schema.format === 'date-time') return 'datetime-local';
        if (schema.format === 'password') return 'password';
        return 'text';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'checkbox';
      default:
        return 'text';
    }
  }
    // Converts a camelCase or PascalCase string to a human-readable format
  private humanize(str: string): string {
    return str
      // Insert a space before all capital letters
      .replace(/([A-Z])/g, ' $1')
      // Capitalize the first letter
      .replace(/^./, (s) => s.toUpperCase())
      .trim();  }
}
