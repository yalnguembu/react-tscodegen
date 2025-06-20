/**
 * Abstract Factory Pattern Implementation
 * Creates different types of generators based on configuration
 */
import { BaseGenerator } from '../BaseGenerator.js';
import { OpenApiSpec, GeneratorOptions } from '../types.js';

export abstract class GeneratorFactory {
  protected spec: OpenApiSpec;
  protected basePath: string;
  protected options: GeneratorOptions;

  constructor(spec: OpenApiSpec, basePath: string, options: GeneratorOptions) {
    this.spec = spec;
    this.basePath = basePath;
    this.options = options;
  }

  abstract createTypesGenerator(): BaseGenerator;
  abstract createSchemasGenerator(): BaseGenerator;
  abstract createServicesGenerator(): BaseGenerator;
  abstract createHooksGenerator(): BaseGenerator;
  abstract createComponentsGenerator(): BaseGenerator;
  abstract createViewsGenerator(): BaseGenerator;
  abstract createMocksGenerator(): BaseGenerator;
  abstract createFakesDataGenerator(): BaseGenerator;

  createGenerators(): Map<string, BaseGenerator> {
    const generators = new Map<string, BaseGenerator>();

    if (this.shouldCreateGenerator('types')) {
      generators.set('types', this.createTypesGenerator());
    }
    
    if (this.shouldCreateGenerator('schemas')) {
      generators.set('schemas', this.createSchemasGenerator());
    }
    
    if (this.shouldCreateGenerator('services')) {
      generators.set('services', this.createServicesGenerator());
    }
    
    if (this.shouldCreateGenerator('views')) {
      generators.set('views', this.createViewsGenerator());
    }
    
    if (this.shouldCreateGenerator('hooks')) {
      generators.set('hooks', this.createHooksGenerator());
    }
    
    if (this.shouldCreateGenerator('components')) {
      generators.set('components', this.createComponentsGenerator());
    }
    
    if (this.shouldCreateGenerator('mocks')) {
      generators.set('mocks', this.createMocksGenerator());
    }
    
    if (this.shouldCreateGenerator('fakesData')) {
      generators.set('fakesData', this.createFakesDataGenerator());
    }

    return generators;
  }

  private shouldCreateGenerator(generatorType: string): boolean {
    return this.options[generatorType as keyof GeneratorOptions] === true || 
           this.isGenerateAllMode();
  }

  private isGenerateAllMode(): boolean {
    return !Object.values(this.options).some(option => option === true);
  }
}
