/**
 * Dependency Injection Container
 * Manages dependencies and provides loose coupling
 */
import { FileSystemAPI, NodeFileSystem } from '../file-system.js';
import { OpenApiSpec, GeneratorOptions } from '../types.js';
import { GenerationStrategy, SequentialGenerationStrategy } from './generation-strategy.js';
import { GeneratorFactory } from './abstract-factory.js';
import { ConcreteGeneratorFactory } from './concrete-factory.js';

export interface ServiceContainer {
  register<T>(key: string, factory: () => T): void;
  registerSingleton<T>(key: string, factory: () => T): void;
  resolve<T>(key: string): T;
  has(key: string): boolean;
}

export class DIContainer implements ServiceContainer {
  private services = new Map<string, any>();
  private singletons = new Map<string, any>();
  private factories = new Map<string, () => any>();

  register<T>(key: string, factory: () => T): void {
    this.factories.set(key, factory);
  }

  registerSingleton<T>(key: string, factory: () => T): void {
    this.factories.set(key, factory);
    this.singletons.set(key, null); // Mark as singleton
  }

  resolve<T>(key: string): T {
    // Check if it's a singleton and already instantiated
    if (this.singletons.has(key)) {
      const existing = this.singletons.get(key);
      if (existing !== null) {
        return existing;
      }
    }

    // Get factory and create instance
    const factory = this.factories.get(key);
    if (!factory) {
      throw new Error(`Service '${key}' not registered`);
    }

    const instance = factory();

    // If singleton, store the instance
    if (this.singletons.has(key)) {
      this.singletons.set(key, instance);
    }

    return instance;
  }

  has(key: string): boolean {
    return this.factories.has(key);
  }

  clear(): void {
    this.services.clear();
    this.singletons.clear();
    this.factories.clear();
  }
}

/**
 * Service locator for accessing dependencies
 */
export class ServiceLocator {
  private static instance: ServiceLocator;
  private container: DIContainer;

  private constructor() {
    this.container = new DIContainer();
    this.registerDefaultServices();
  }

  static getInstance(): ServiceLocator {
    if (!ServiceLocator.instance) {
      ServiceLocator.instance = new ServiceLocator();
    }
    return ServiceLocator.instance;
  }

  private registerDefaultServices(): void {
    // Register default file system
    this.container.registerSingleton('fileSystem', () => new NodeFileSystem());
    
    // Register default generation strategy
    this.container.register('generationStrategy', () => new SequentialGenerationStrategy());
  }

  registerService<T>(key: string, factory: () => T): void {
    this.container.register(key, factory);
  }

  registerSingleton<T>(key: string, factory: () => T): void {
    this.container.registerSingleton(key, factory);
  }

  getService<T>(key: string): T {
    return this.container.resolve<T>(key);
  }

  hasService(key: string): boolean {
    return this.container.has(key);
  }

  reset(): void {
    this.container.clear();
    this.registerDefaultServices();
  }

  // Convenience methods for common services
  getFileSystem(): FileSystemAPI {
    return this.getService<FileSystemAPI>('fileSystem');
  }

  getGenerationStrategy(): GenerationStrategy {
    return this.getService<GenerationStrategy>('generationStrategy');
  }

  createGeneratorFactory(spec: OpenApiSpec, basePath: string, options: GeneratorOptions): GeneratorFactory {
    if (this.hasService('generatorFactory')) {
      return this.getService<GeneratorFactory>('generatorFactory');
    }
    return new ConcreteGeneratorFactory(spec, basePath, options);
  }
}
