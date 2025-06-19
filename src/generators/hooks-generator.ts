import { BaseGenerator } from '../base-generator.js';
import { FileSystemAPI } from '../file-system.js';
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
    generate(): Map<string, string> {
    // Get config options
    const useReactQuery = this.config.options?.hooksGeneration?.useReactQuery !== false;
    const includeInfiniteQueries = this.config.options?.hooksGeneration?.includeInfiniteQueries !== false;
    const includeMutations = this.config.options?.hooksGeneration?.includeMutations !== false;
    
    console.log(`Generating hooks with React Query: ${useReactQuery}`);
    console.log(`Include infinite queries: ${includeInfiniteQueries}`);
    console.log(`Include mutations: ${includeMutations}`);
    
    // If no services were provided, try to load them from the services directory
    if (this._servicesCode.size === 0) {
      this.loadServicesFromFiles();
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
      const serviceFiles = files.filter(file => file.endsWith('.service.ts'));
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
    // Extract service name from file name (e.g., user.service.ts -> UserService)
    const match = fileName.match(/(.+)\.service\.ts$/);
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
    matches.forEach(match => {
      const methodName = match[1];
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
    
    const templatePath = path.resolve(__dirname, '../../', this.config.templates?.hook || '../templates/hook.template.ts');
    let hookTemplate = '';
    
    try {
      if (fs.existsSync(templatePath)) {
        hookTemplate = fs.readFileSync(templatePath, 'utf8');
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
    
    const queryKeyString = queryKeyParts.length > 0
      ? `'${resourceName}', '${methodName}', ${queryKeyParts.join(', ')}`
      : `'${resourceName}', '${methodName}'`;
    
    const queryParamsString = queryKeyParts.length > 0
      ? `{ ${queryKeyParts.join(', ')} }: { ${params} }`
      : '';
    
    const queryTemplate = `
export function ${hookName}(${queryParamsString}) {
  return useQuery({
    queryKey: [${queryKeyString}],
    queryFn: () => ${serviceName}.${methodName}(${queryKeyParts.join(', ')}),
  });
}`;
    
    return queryTemplate;
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
    
    const mutationTemplate = `
export function ${hookName}() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (${params || 'data: any'}) => ${serviceName}.${methodName}(${params ? params.split(',').map(p => p.trim().split(':')[0].trim()).join(', ') : 'data'}),
    onSuccess: () => {
      // Invalidate related queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['${resourceName}'] });
    },
  });
}`;
    
    return mutationTemplate;
  }
}
