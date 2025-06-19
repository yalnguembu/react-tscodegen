/**
 * Strategy Pattern for Generation Strategies
 * Defines different approaches to code generation
 */
import { BaseGenerator } from '../base-generator.js';
import { FileSystemAPI } from '../file-system.js';

export interface GenerationStrategy {
  execute(generators: Map<string, BaseGenerator>, fileSystem: FileSystemAPI): GenerationResult;
}

export interface GenerationResult {
  success: boolean;
  generatedFiles: Map<string, string>;
  errors: Error[];
  statistics: GenerationStatistics;
}

export interface GenerationStatistics {
  totalFiles: number;
  typesCount: number;
  schemasCount: number;
  servicesCount: number;
  hooksCount: number;
  componentsCount: number;
  mocksCount: number;
  fakesCount: number;
  viewsCount: number;
  executionTime: number;
}

/**
 * Sequential generation strategy - generates one by one
 */
export class SequentialGenerationStrategy implements GenerationStrategy {
  execute(generators: Map<string, BaseGenerator>, fileSystem: FileSystemAPI): GenerationResult {
    const startTime = Date.now();
    const allGenerated = new Map<string, string>();
    const errors: Error[] = [];
    
    try {
      // Generate in dependency order: types -> schemas -> services -> views -> hooks -> components -> mocks -> fakes
      const generationOrder = ['types', 'schemas', 'services', 'views', 'hooks', 'components', 'mocks', 'fakesData'];
      
      for (const generatorName of generationOrder) {
        const generator = generators.get(generatorName);
        if (generator) {
          try {
            const generated = generator.generate();
            this.mergeIntoMap(allGenerated, generated);
            generator.saveFiles(fileSystem);
          } catch (error) {
            errors.push(error instanceof Error ? error : new Error(String(error)));
          }
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }

    const executionTime = Date.now() - startTime;
    const statistics = this.calculateStatistics(allGenerated, executionTime);

    return {
      success: errors.length === 0,
      generatedFiles: allGenerated,
      errors,
      statistics
    };
  }

  private mergeIntoMap(target: Map<string, string>, source: Map<string, string>): void {
    source.forEach((value, key) => target.set(key, value));
  }

  private calculateStatistics(generated: Map<string, string>, executionTime: number): GenerationStatistics {
    const keys = [...generated.keys()];
    
    return {
      totalFiles: generated.size,
      typesCount: keys.filter(key => key.includes('type') || key.endsWith('dto')).length,
      schemasCount: keys.filter(key => key.includes('schema')).length,
      servicesCount: keys.filter(key => key.includes('service')).length,
      hooksCount: keys.filter(key => key.includes('hook')).length,
      componentsCount: keys.filter(key => key.includes('component') || key.includes('form') || key.includes('list')).length,
      mocksCount: keys.filter(key => key.includes('mock')).length,
      fakesCount: keys.filter(key => key.includes('fake')).length,
      viewsCount: keys.filter(key => key.includes('view')).length,
      executionTime
    };
  }
}

/**
 * Parallel generation strategy - generates multiple generators concurrently
 */
export class ParallelGenerationStrategy implements GenerationStrategy {
  async execute(generators: Map<string, BaseGenerator>, fileSystem: FileSystemAPI): Promise<GenerationResult> {
    const startTime = Date.now();
    const allGenerated = new Map<string, string>();
    const errors: Error[] = [];

    try {
      // Split generators into dependency groups
      const independentGenerators = ['types', 'schemas', 'services', 'views'];
      const dependentGenerators = ['hooks', 'components', 'mocks', 'fakesData'];

      // First, run independent generators in parallel
      const independentPromises = independentGenerators
        .map(name => generators.get(name))
        .filter(generator => generator !== undefined)
        .map(async (generator) => {
          try {
            const generated = generator.generate();
            generator.saveFiles(fileSystem);
            return { success: true, generated, error: null };
          } catch (error) {
            return { 
              success: false, 
              generated: new Map(), 
              error: error instanceof Error ? error : new Error(String(error)) 
            };
          }
        });

      const independentResults = await Promise.all(independentPromises);
      
      // Merge results and collect errors
      independentResults.forEach(result => {
        if (result.success) {
          this.mergeIntoMap(allGenerated, result.generated);
        } else if (result.error) {
          errors.push(result.error);
        }
      });

      // Then run dependent generators
      for (const generatorName of dependentGenerators) {
        const generator = generators.get(generatorName);
        if (generator) {
          try {
            const generated = generator.generate();
            this.mergeIntoMap(allGenerated, generated);
            generator.saveFiles(fileSystem);
          } catch (error) {
            errors.push(error instanceof Error ? error : new Error(String(error)));
          }
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }

    const executionTime = Date.now() - startTime;
    const statistics = this.calculateStatistics(allGenerated, executionTime);

    return {
      success: errors.length === 0,
      generatedFiles: allGenerated,
      errors,
      statistics
    };
  }

  private mergeIntoMap(target: Map<string, string>, source: Map<string, string>): void {
    source.forEach((value, key) => target.set(key, value));
  }

  private calculateStatistics(generated: Map<string, string>, executionTime: number): GenerationStatistics {
    const keys = [...generated.keys()];
    
    return {
      totalFiles: generated.size,
      typesCount: keys.filter(key => key.includes('type') || key.endsWith('dto')).length,
      schemasCount: keys.filter(key => key.includes('schema')).length,
      servicesCount: keys.filter(key => key.includes('service')).length,
      hooksCount: keys.filter(key => key.includes('hook')).length,
      componentsCount: keys.filter(key => key.includes('component') || key.includes('form') || key.includes('list')).length,
      mocksCount: keys.filter(key => key.includes('mock')).length,
      fakesCount: keys.filter(key => key.includes('fake')).length,
      viewsCount: keys.filter(key => key.includes('view')).length,
      executionTime
    };
  }
}
