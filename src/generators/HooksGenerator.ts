import { BaseGenerator } from '../BaseGenerator.js';
import { FileSystemAPI } from '../FileSystem.js';
import { TemplateEngine, TemplateVariables } from '../core/TemplateEngine.js';
import { 
  QUERY_HOOK_TEMPLATE, 
  MUTATION_HOOK_TEMPLATE, 
  HOOK_IMPORTS_TEMPLATE 
} from '../templates/hook.template.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the equivalent of __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class HooksGenerator extends BaseGenerator {
  private _generatedHooks: Map<string, string> = new Map();
  private _servicesCode: Map<string, string> = new Map();
  
  constructor(spec: any, basePath: string, servicesCode?: Map<string, string>) {
    super(spec, basePath);
    if (servicesCode) {
      this._servicesCode = servicesCode;
    }
  }

  protected getGeneratorKey(): string {
    return 'hooks';
  }

  protected performGeneration(): Map<string, string> {
    return this.generate();
  }

  protected async generateFiles(fs: FileSystemAPI): Promise<void> {
    this.saveFiles(fs);
  }
  generate(): Map<string, string> {    // Get config options (use defaults for now)
    const useReactQuery = true;
    const includeInfiniteQueries = true;
    const includeMutations = true;
    
    console.log(`Generating hooks with React Query: ${useReactQuery}`);
    console.log(`Include infinite queries: ${includeInfiniteQueries}`);
    console.log(`Include mutations: ${includeMutations}`);
    
    // If no services were provided, try to load them from the services directory
    if (this._servicesCode.size === 0) {
      this.loadServicesFromFiles();
      
      // If still no services found, generate them directly from the OpenAPI spec
      if (this._servicesCode.size === 0) {
        this.generateServicesFromSpec();
      }
    }
    
    // Generate hooks for each service
    this._servicesCode.forEach((serviceCode, serviceName) => {
      const hookCode = this.generateHooksForService(
        serviceName, 
        serviceCode,
        { useReactQuery, includeInfiniteQueries, includeMutations }
      );
      if (hookCode) {
        this._generatedHooks.set(`${serviceName.replace('Service', '')}Hooks`, hookCode);
      }
    });
    
    return this._generatedHooks;
  }
  
  saveFiles(fs: FileSystemAPI): void {
    const hooksDir = this.getOutputDirectory('hooks');
    fs.ensureDirectoryExists(hooksDir);
    
    let indexFileContent = '// Auto-generated React Query hooks from API spec\n\n';
    
    this._generatedHooks.forEach((content, name) => {
      const fileName = `${this.toKebabCase(name)}.ts`;
      const filePath = fs.joinPath(hooksDir, fileName);
      
      fs.writeFile(filePath, content);
      
      indexFileContent += `export * from './${this.toKebabCase(name)}';\n`;
    });
    
    this.createIndexFile(hooksDir, indexFileContent, fs);
  }
  
  private loadServicesFromFiles(): void {
    const servicesPath = path.join(this.basePath, 'services');
    
    if (fs.existsSync(servicesPath)) {
      const files = fs.readdirSync(servicesPath);
      
      files.forEach(file => {
        if (file.endsWith('.ts') && !file.endsWith('index.ts')) {
          const servicePath = path.join(servicesPath, file);
          const serviceCode = fs.readFileSync(servicePath, 'utf8');
          const serviceName = this.getServiceNameFromFile(file);
          
          if (serviceName) {
            this._servicesCode.set(serviceName, serviceCode);
          }
        }
      });
    }
  }
    loadServicesFromDirectory(directory: string, fs: FileSystemAPI): void {
    console.log(`Loading services from directory: ${directory}`);
    try {
      // Check if the readDirectory method exists
      if (!fs.readDirectory) {
        console.error('The file system implementation does not support directory reading');
        return;
      }
        const files = fs.readDirectory(directory);
      const serviceFiles = files.filter(file => file.endsWith('-service.ts') || file.endsWith('.service.ts'));
        serviceFiles.forEach(file => {
        const filePath = fs.joinPath(directory, file);
        // Read file contents using the readFile method if available
        const content = fs.readFile ? fs.readFile(filePath) : require('fs').readFileSync(filePath, 'utf8');
        const serviceName = this.extractServiceName(file);
        if (serviceName) {
          this._servicesCode.set(serviceName, content);
        }
      });
      
      console.log(`Loaded ${this._servicesCode.size} service files from custom directory`);
    } catch (error) {
      console.error(`Error loading services from directory ${directory}:`, error);
    }
  }
    private extractServiceName(fileName: string): string | null {
    // Extract service name from file name (e.g., authentication-service.ts -> AuthenticationService)
    let match = fileName.match(/(.+)-service\.ts$/);
    if (!match) {
      // Also support .service.ts pattern (e.g., user.service.ts -> UserService)
      match = fileName.match(/(.+)\.service\.ts$/);
    }
    
    if (match && match[1]) {
      const baseName = match[1];
      // Convert kebab-case to PascalCase
      const pascalCase = baseName
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
      return `${pascalCase}Service`;
    }
    return null;
  }
  
  private getServiceNameFromFile(fileName: string): string | null {
    // Convert kebab-case to PascalCase and add Service suffix if missing
    const baseName = fileName.replace(/\.ts$/, '');
    const parts = baseName.split('-');
    const pascalCase = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
    
    return pascalCase.endsWith('Service') ? pascalCase : `${pascalCase}Service`;
  }
    private generateHooksForService(
    serviceName: string, 
    serviceCode: string, 
    options: { useReactQuery: boolean; includeInfiniteQueries: boolean; includeMutations: boolean } = {
      useReactQuery: true, 
      includeInfiniteQueries: true, 
      includeMutations: true
    }
  ): string {
    // Extract the endpoints from the service code
    // Updated regex to match service methods that return CancelablePromise
    const regex = /(\w+)\(([^)]*)\):\s*CancelablePromise<[^>]+>/g;
    const matches = Array.from(serviceCode.matchAll(regex));
    
    if (!matches.length) {
      console.log(`No service methods found in ${serviceName} using pattern: methodName(params): CancelablePromise<Type>`);
      return '';
    }
    
    console.log(`Found ${matches.length} service methods in ${serviceName}:`, matches.map(m => m[1]));
    
    const resourceName = serviceName.replace('Service', '');
    const serviceLower = serviceName.charAt(0).toLowerCase() + serviceName.slice(1);
    const serviceFile = this.toKebabCase(serviceName);
      // Generate imports
    let importedTypes = new Set<string>();
    matches.forEach(match => {
      const methodName = match[1];
      importedTypes.add(resourceName);
    });
    
    const hookImports = TemplateEngine.process(HOOK_IMPORTS_TEMPLATE, {
      importedTypes: Array.from(importedTypes).join(', '),
      serviceName,
      serviceLower,
      serviceFile
    });
    
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
      try {
      const templateHookConfig = this.config.templates?.hook;
      let templatePath;
      
      if (typeof templateHookConfig === 'string') {
        // If it's a string, use it directly as path
        templatePath = path.resolve(__dirname, '../../', templateHookConfig);
      } else if (templateHookConfig && typeof templateHookConfig === 'object' && templateHookConfig.path) {
        // If it's an object with a path property, use that
        templatePath = path.resolve(__dirname, '../../', templateHookConfig.path);
      } else {
        // Default template path
        templatePath = path.resolve(__dirname, '../../templates/hook.template.ts');
      }
      
      if (fs.existsSync(templatePath)) {
        const hookTemplate = fs.readFileSync(templatePath, 'utf8');
        return hookTemplate
          .replace('{{imports}}', hookImports)
          .replace('{{hookFunctions}}', hookFunctions);
      }
    } catch (error) {
      console.error('Error loading hook template:', error);
    }
    
    // Fallback to built-in template if template file doesn't exist
    return `${hookImports}/**
 * React Query hooks for ${resourceName} endpoints
 */
${hookFunctions}`;
  }
  private generateQueryHook(resourceName: string, serviceName: string, methodName: string, params: string): string {
    const hookName = `use${methodName.charAt(0).toUpperCase() + methodName.slice(1)}`;
    const queryKeyParts = params
      .split(',')
      .filter(p => p.trim())
      .map(p => {
        const [name] = p.trim().split(':');
        return name.trim();
      });
    
    const variables: TemplateVariables = {
      methodName: hookName,
      camelCaseMethodName: hookName.replace('use', ''),
      resourceName,
      serviceName,
      serviceMethodName: methodName, // The actual service method name
      params: queryKeyParts.length > 0 ? `{ ${queryKeyParts.join(', ')} }: { ${params} }` : '',
      hasParams: queryKeyParts.length > 0 ? `, ${queryKeyParts.join(', ')}` : '',
      methodParams: queryKeyParts.join(', ')
    };
    
    return TemplateEngine.process(QUERY_HOOK_TEMPLATE, variables);
  }
  private generateMutationHook(resourceName: string, serviceName: string, methodName: string, params: string): string {
    const hookName = `use${methodName.charAt(0).toUpperCase() + methodName.slice(1)}`;
    
    // Try to determine the type of data being operated on
    let dataType = 'any';
    if (params.includes(':')) {
      const dataParam = params.split(',').find(p => p.trim().startsWith('data:'));
      if (dataParam) {
        dataType = dataParam.split(':')[1].trim();
      }
    }
    
    const methodParams = params ? params.split(',').map(p => p.trim().split(':')[0].trim()).join(', ') : 'data';
    
    const variables: TemplateVariables = {
      methodName: hookName,
      camelCaseMethodName: hookName.replace('use', ''),
      resourceName,
      serviceName,
      serviceMethodName: methodName, // The actual service method name
      params: params || 'data: any',
      methodParams
    };
    
    return TemplateEngine.process(MUTATION_HOOK_TEMPLATE, variables);
  }
  
  /**
   * Generate service code directly from the OpenAPI spec if no service files are found
   */  private generateServicesFromSpec(): void {
    // Group endpoints by tag to create services
    const serviceGroups: Record<string, any[]> = {};

    // Process OpenAPI paths
    Object.entries(this.spec.paths || {}).forEach(([path, methods]) => {
      Object.entries(methods || {}).forEach(([method, endpoint]: [string, any]) => {
        const tag = endpoint.tags?.[0] || 'Default';
        const serviceName = `${tag}Service`;

        if (!serviceGroups[serviceName]) {
          serviceGroups[serviceName] = [];
        }

        serviceGroups[serviceName].push({
          path,
          method: method.toUpperCase(),
          endpoint,
          operationId: this.generateOperationId(method, path),
        });
      });
    });

    // Generate dummy service code for each service group
    Object.entries(serviceGroups).forEach(([serviceName, endpoints]) => {
      let serviceCode = `class ${serviceName} {\n`;
      
      endpoints.forEach(({ operationId, path, method }) => {
        // Generate a simple method signature based on the operationId and path
        serviceCode += `  async ${operationId}(data) {\n`;
        serviceCode += `    // ${method} ${path}\n`;
        serviceCode += `    return { data };\n`;
        serviceCode += `  }\n\n`;
      });
      
      serviceCode += `}\n\n`;
      serviceCode += `export const ${serviceName.charAt(0).toLowerCase() + serviceName.slice(1)} = new ${serviceName}();\n`;
      
      this._servicesCode.set(serviceName, serviceCode);
    });
    
    console.log(`Generated ${Object.keys(serviceGroups).length} service stubs from OpenAPI spec for hook generation`);
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
}
