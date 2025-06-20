/**
 * Enhanced Base Generator with improved OOP design
 * Implements Template Method Pattern and provides better abstraction
 */
import { FileSystemAPI } from './FileSystem.js';
import { OpenApiSpec, SchemaDefinition } from './types.js';
import SwaggerParser from '@apidevtools/swagger-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the equivalent of __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface GeneratorConfig {
  paths: Record<string, string>;
  templates: Record<string, any>;
  naming: {
    conventions: Record<string, string>;
  };
}

export interface GenerationContext {
  spec: OpenApiSpec;
  basePath: string;
  config: GeneratorConfig;
  outputDirectory: string;
}

/**
 * Abstract base class for all generators
 * Implements Template Method Pattern
 */
export abstract class BaseGenerator {
  protected spec: OpenApiSpec;
  protected basePath: string;
  protected config: GeneratorConfig;
  protected context: GenerationContext;
  
  constructor(spec: OpenApiSpec, basePath: string) {
    this.spec = spec;
    this.basePath = basePath;
    this.config = this.getDefaultConfig(); // Initialize with default first
    this.loadConfig(); // Then load from file if available
    this.context = this.createInitialContext(); // Initialize context
    this.initializeContext(); // Then complete initialization
  }

  private createInitialContext(): GenerationContext {
    return {
      spec: this.spec,
      basePath: this.basePath,
      config: this.config,
      outputDirectory: this.basePath // Will be updated in initializeContext
    };
  }
  /**
   * Template method - defines the skeleton of the generation process
   * Subclasses can override specific steps but not the overall structure
   * NOTE: This method should not be overridden - use performGeneration() instead
   */
  public generate(): Map<string, string> {
    this.validateSpec();
    this.preprocessData();
    const result = this.performGeneration();
    this.postprocessResult(result);
    return result;
  }

  /**
   * Template method for saving files
   * NOTE: This method should not be overridden - use generateFiles() instead
   */
  public saveFiles(fs: FileSystemAPI): void {
    this.prepareOutputDirectory(fs);
    this.generateFiles(fs);
    this.createIndexFiles(fs);
    this.finalizeSaving(fs);
  }

  // Abstract methods that subclasses must implement
  protected abstract performGeneration(): Map<string, string>;
  protected abstract generateFiles(fs: FileSystemAPI): void;

  // Hook methods that subclasses can override
  protected validateSpec(): void {
    if (!this.spec || !this.spec.components || !this.spec.components.schemas) {
      throw new Error('Invalid OpenAPI specification provided');
    }
  }

  protected preprocessData(): void {
    // Default implementation - can be overridden
  }

  protected postprocessResult(result: Map<string, string>): void {
    // Default implementation - can be overridden
  }

  protected prepareOutputDirectory(fs: FileSystemAPI): void {
    const outputDir = this.getOutputDirectory();
    fs.ensureDirectoryExists(outputDir);
  }

  protected createIndexFiles(fs: FileSystemAPI): void {
    // Default implementation - can be overridden by subclasses
  }

  protected finalizeSaving(fs: FileSystemAPI): void {
    // Default implementation - can be overridden
  }

  // Utility methods
  protected loadConfig(): void {
    try {
      const configPath = path.resolve(__dirname, '../config.json');
      const configContent = fs.readFileSync(configPath, 'utf8');
      this.config = JSON.parse(configContent);
    } catch (error) {
      console.warn('Warning: Could not load config file, using defaults');
      this.config = this.getDefaultConfig();
    }
  }

  protected getDefaultConfig(): GeneratorConfig {
    return {
      paths: {
        types: 'types',
        schemas: 'schemas',
        services: 'services',
        hooks: 'hooks',
        components: 'components',
        views: 'views',
        mocks: 'mocks',
        fakesData: 'fakes-data'
      },
      templates: {},
      naming: {
        conventions: {
          file: 'kebab-case',
          class: 'PascalCase',
          interface: 'PascalCase',
          function: 'camelCase'
        }
      }
    };
  }

  protected initializeContext(): void {
    this.context = {
      spec: this.spec,
      basePath: this.basePath,
      config: this.config,
      outputDirectory: this.getOutputDirectory()
    };
  }

  protected getOutputDirectory(key?: string): string {
    const generatorKey = key || this.getGeneratorKey();
    const configPath = typeof this.config.paths?.[generatorKey] === 'string' 
      ? this.config.paths[generatorKey] 
      : generatorKey;
    return path.join(this.basePath, configPath);
  }
  /**
   * Dereference the OpenAPI spec to resolve all $ref and allOf schemas
   * This ensures that complex schemas like those using allOf are properly resolved
   */
  protected async dereferenceSpec(spec: OpenApiSpec): Promise<OpenApiSpec> {
    try {
      const dereferencedSpec = await SwaggerParser.dereference(spec as any);
      return dereferencedSpec as unknown as OpenApiSpec;
    } catch (error) {
      console.warn('Failed to dereference spec:', error);
      return spec; // Fallback to original spec
    }
  }

  /**
   * Initialize the spec with proper dereferencing
   * This should be called after construction when async operations are possible
   */
  public async initializeSpec(): Promise<void> {
    this.spec = await this.dereferenceSpec(this.spec);
    this.context.spec = this.spec;
  }

  // Abstract method for getting the generator key
  protected abstract getGeneratorKey(): string;

  // Common utility methods
  protected toKebabCase(str: string): string {
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z])(?=[a-z])/g, '$1-$2')
      .toLowerCase();
  }

  protected toPascalCase(str: string): string {
    return str
      .replace(/[-_](.)/g, (_, char) => char.toUpperCase())
      .replace(/^./, char => char.toUpperCase());
  }

  protected toCamelCase(str: string): string {
    const pascalCase = this.toPascalCase(str);
    return pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1);
  }

  protected createIndexFile(directory: string, content: string, fileSystem: FileSystemAPI): void {
    fileSystem.writeFile(fileSystem.joinPath(directory, 'index.ts'), content);
  }

  protected extractNameFromRef(ref: string): string {
    return ref.split('/').pop() || 'Unknown';
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

  // Observer pattern support
  private observers: GeneratorObserver[] = [];

  addObserver(observer: GeneratorObserver): void {
    this.observers.push(observer);
  }

  removeObserver(observer: GeneratorObserver): void {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  protected notifyObservers(event: string, data?: any): void {
    this.observers.forEach(observer => observer.onGeneratorEvent(event, data));
  }
}

/**
 * Observer interface for generator events
 */
export interface GeneratorObserver {
  onGeneratorEvent(event: string, data?: any): void;
}

/**
 * Concrete observer for logging generator events
 */
export class LoggingObserver implements GeneratorObserver {
  constructor(private verbose: boolean = false) {}

  onGeneratorEvent(event: string, data?: any): void {
    if (this.verbose) {
      console.log(`Generator event: ${event}`, data ? data : '');
    }
  }
}
