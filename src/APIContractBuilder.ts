import { BaseGenerator } from './BaseGenerator.js';
import { FileSystemAPI, NodeFileSystem } from './FileSystem.js';
import { GeneratorOptions, OpenApiSpec } from './types.js';
import { GeneratorFactory } from './core/AbstractFactory.js';
import { ConcreteGeneratorFactory } from './core/ConcreteFactory.js';
import { GenerationStrategy, SequentialGenerationStrategy, GenerationResult } from './core/GenerationStrategy.js';

export class APIContractBuilder extends BaseGenerator {
  private generatorFactory: GeneratorFactory;
  private generators: Map<string, BaseGenerator> = new Map();
  private generationStrategy: GenerationStrategy;
  private options: GeneratorOptions;
  private verbose: boolean = false;

  constructor(spec: OpenApiSpec, basePath: string = './frontend/src', options: GeneratorOptions = {}) {
    super(spec, basePath);
    this.options = options;
    this.generationStrategy = new SequentialGenerationStrategy();
    
    // Initialize factory and create generators
    this.generatorFactory = new ConcreteGeneratorFactory(spec, basePath, options);
    this.generators = this.generatorFactory.createGenerators();
  }

  /**
   * Set generation strategy (Strategy Pattern)
   */
  setGenerationStrategy(strategy: GenerationStrategy): void {
    this.generationStrategy = strategy;
  }

  /**
   * Set options for generation
   */  setOptions(options: GeneratorOptions): void {
    this.options = { ...this.options, ...options };
    // Recreate generators with new options
    this.generatorFactory = new ConcreteGeneratorFactory(this.spec, this.basePath, this.options);
    this.generators = this.generatorFactory.createGenerators();
  }

  /**
   * Set verbose mode
   */
  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  /**
   * Get generator key for base class
   */
  protected getGeneratorKey(): string {
    return 'contract';
  }  /**
   * Main method to generate all API contract code using Strategy Pattern
   * This overrides the base generate method to support async operations
   */  async generateAsync(): Promise<Map<string, string>> {
    const fileSystem = new NodeFileSystem();
    const result = await Promise.resolve(this.generationStrategy.execute(this.generators, fileSystem));
    
    if (!result.success) {
      console.error('Generation failed with errors:', result.errors);
    }
    
    if (this.verbose && result.statistics) {
      this.logStatistics(result.statistics);
    }
    
    return result.generatedFiles;
  }

  /**
   * Synchronous generate method for base class compatibility
   */
  generate(): Map<string, string> {    // For synchronous compatibility, we'll run the sequential strategy
    const fileSystem = new NodeFileSystem();
    const result = this.generationStrategy.execute(this.generators, fileSystem);
    
    // Handle both sync and async results
    if (result instanceof Promise) {
      throw new Error('Use generateAsync() for asynchronous generation strategies');
    }
    
    if (!result.success) {
      console.error('Generation failed with errors:', result.errors);
    }
    
    if (this.verbose && result.statistics) {
      this.logStatistics(result.statistics);
    }
    
    return result.generatedFiles;
  }
  
  /**
   * Check if any specific generator option is enabled
   */
  private hasSpecificGeneratorOption(): boolean {
    return !!(
      this.options.types ||
      this.options.schemas ||
      this.options.services ||
      this.options.views ||
      this.options.hooks ||
      this.options.components ||
      this.options.mocks ||
      this.options.fakesData
    );
  }

  /**
   * Save all generated files using Strategy Pattern
   */
  saveFiles(fs: FileSystemAPI): void {
    console.log("\n=== Generating API Contract Files ===\n");
    
    this.generators.forEach((generator, name) => {
      try {
        console.log(`Generating ${name}...`);
        generator.saveFiles(fs);
        if (this.verbose) {
          console.log(`✓ Saved ${name} files`);
        }
      } catch (error) {
        console.error(`✗ Failed to save ${name} files:`, error);
      }
    });

    console.log("\nGeneration completed successfully!");
  }

  /**
   * Log generation statistics
   */
  private logStatistics(statistics: any): void {
    console.log('\n=== Generation Statistics ===');
    console.log(`Total files: ${statistics.totalFiles}`);
    console.log(`Types: ${statistics.typesCount}`);
    console.log(`Schemas: ${statistics.schemasCount}`);
    console.log(`Services: ${statistics.servicesCount}`);
    console.log(`Views: ${statistics.viewsCount}`);
    console.log(`Hooks: ${statistics.hooksCount}`);
    console.log(`Components: ${statistics.componentsCount}`);
    console.log(`Mocks: ${statistics.mocksCount}`);
    console.log(`Fake data generators: ${statistics.fakesCount}`);
    console.log(`Execution time: ${statistics.executionTime}ms`);
    console.log('============================\n');
  }

  /**
   * Implementation of abstract method from BaseGenerator
   */
  protected performGeneration(): Map<string, string> {
    const allGenerated = new Map<string, string>();
    
    this.generators.forEach((generator, name) => {
      try {
        const generated = generator.generate();
        this.mergeIntoMap(allGenerated, generated);
      } catch (error) {
        console.error(`Error generating ${name}:`, error);
      }
    });
    
    return allGenerated;
  }

  /**
   * Implementation of abstract method from BaseGenerator
   */
  protected generateFiles(fs: FileSystemAPI): void {
    this.saveFiles(fs);
  }

  /**
   * Merge maps utility
   */
  private mergeIntoMap(target: Map<string, string>, source: Map<string, string>): void {
    source.forEach((value, key) => target.set(key, value));
  }

  /**
   * Get available generators
   */
  getAvailableGenerators(): string[] {
    return Array.from(this.generators.keys());
  }

  /**
   * Get specific generator
   */
  getGenerator(name: string): BaseGenerator | undefined {
    return this.generators.get(name);
  }

  /**
   * Add custom generator
   */
  addCustomGenerator(name: string, generator: BaseGenerator): void {
    this.generators.set(name, generator);
  }

  /**
   * Remove generator
   */
  removeGenerator(name: string): boolean {
    return this.generators.delete(name);
  }
}
