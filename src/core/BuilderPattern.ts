/**
 * Builder Pattern for Complex Object Construction
 * Creates ApiContractBuilder instances with fluent interface
 */
import { OpenApiSpec, GeneratorOptions } from '../types.js';
import { APIContractBuilder } from '../APIContractBuilder.js';
import { GenerationStrategy, SequentialGenerationStrategy, ParallelGenerationStrategy } from './GenerationStrategy.js';

export class ApiContractBuilderDirector {
  private spec: OpenApiSpec;
  private basePath: string = './frontend/src';
  private options: GeneratorOptions = {};
  private strategy: GenerationStrategy = new SequentialGenerationStrategy();
  private verbose: boolean = false;

  constructor(spec: OpenApiSpec) {
    this.spec = spec;
  }

  setBasePath(basePath: string): ApiContractBuilderDirector {
    this.basePath = basePath;
    return this;
  }

  setOptions(options: GeneratorOptions): ApiContractBuilderDirector {
    this.options = { ...this.options, ...options };
    return this;
  }

  enableTypes(): ApiContractBuilderDirector {
    this.options.types = true;
    return this;
  }

  enableSchemas(): ApiContractBuilderDirector {
    this.options.schemas = true;
    return this;
  }

  enableServices(): ApiContractBuilderDirector {
    this.options.services = true;
    return this;
  }

  enableViews(): ApiContractBuilderDirector {
    this.options.views = true;
    return this;
  }

  enableHooks(): ApiContractBuilderDirector {
    this.options.hooks = true;
    return this;
  }

  enableComponents(): ApiContractBuilderDirector {
    this.options.components = true;
    return this;
  }

  enableMocks(): ApiContractBuilderDirector {
    this.options.mocks = true;
    return this;
  }

  enableFakesData(): ApiContractBuilderDirector {
    this.options.fakesData = true;
    return this;
  }

  enableAll(): ApiContractBuilderDirector {
    return this
      .enableTypes()
      .enableSchemas()
      .enableServices()
      .enableViews()
      .enableHooks()
      .enableComponents()
      .enableMocks()
      .enableFakesData();
  }

  useSequentialStrategy(): ApiContractBuilderDirector {
    this.strategy = new SequentialGenerationStrategy();
    return this;
  }

  useParallelStrategy(): ApiContractBuilderDirector {
    this.strategy = new ParallelGenerationStrategy();
    return this;
  }

  setVerbose(verbose: boolean): ApiContractBuilderDirector {
    this.verbose = verbose;
    return this;
  }

  build(): APIContractBuilder {
    const builder = new APIContractBuilder(this.spec, this.basePath, this.options);
    builder.setGenerationStrategy(this.strategy);
    builder.setVerbose(this.verbose);
    return builder;
  }

  /**
   * Preset configurations for common use cases
   */
  static createForFrontendDevelopment(spec: OpenApiSpec, basePath: string): ApiContractBuilderDirector {
    return new ApiContractBuilderDirector(spec)
      .setBasePath(basePath)
      .enableTypes()
      .enableSchemas()
      .enableServices()
      .enableHooks()
      .enableComponents()
      .useSequentialStrategy();
  }

  static createForBackendTesting(spec: OpenApiSpec, basePath: string): ApiContractBuilderDirector {
    return new ApiContractBuilderDirector(spec)
      .setBasePath(basePath)
      .enableTypes()
      .enableSchemas()
      .enableMocks()
      .enableFakesData()
      .useParallelStrategy();
  }

  static createMinimal(spec: OpenApiSpec, basePath: string): ApiContractBuilderDirector {
    return new ApiContractBuilderDirector(spec)
      .setBasePath(basePath)
      .enableTypes()
      .enableServices()
      .useSequentialStrategy();
  }

  static createFull(spec: OpenApiSpec, basePath: string): ApiContractBuilderDirector {
    return new ApiContractBuilderDirector(spec)
      .setBasePath(basePath)
      .enableAll()
      .useParallelStrategy();
  }
}
