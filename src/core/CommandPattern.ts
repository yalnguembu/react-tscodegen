/**
 * Command Pattern for CLI Operations
 * Encapsulates CLI operations as objects
 */
import { OpenApiSpec, GeneratorOptions } from '../types.js';
import { FileSystemAPI } from '../FileSystem.js';
import { GenerationResult } from './GenerationStrategy.js';

export interface Command {
  execute(): Promise<GenerationResult>;
  undo?(): Promise<void>;
  getDescription(): string;
}

export abstract class BaseCommand implements Command {
  protected spec: OpenApiSpec;
  protected basePath: string;
  protected options: GeneratorOptions;
  protected fileSystem: FileSystemAPI;

  constructor(
    spec: OpenApiSpec, 
    basePath: string, 
    options: GeneratorOptions, 
    fileSystem: FileSystemAPI
  ) {
    this.spec = spec;
    this.basePath = basePath;
    this.options = options;
    this.fileSystem = fileSystem;
  }

  abstract execute(): Promise<GenerationResult>;
  abstract getDescription(): string;

  async undo(): Promise<void> {
    throw new Error('Undo operation not implemented for this command');
  }
}

/**
 * Command to generate specific generator types
 */
export class GenerateCommand extends BaseCommand {
  private generatorTypes: string[];

  constructor(
    spec: OpenApiSpec,
    basePath: string,
    options: GeneratorOptions,
    fileSystem: FileSystemAPI,
    generatorTypes: string[]
  ) {
    super(spec, basePath, options, fileSystem);
    this.generatorTypes = generatorTypes;
  }

  async execute(): Promise<GenerationResult> {
    const { APIContractBuilder: APIContractBuilder } = await import('../APIContractBuilder.js');
    const builder = new APIContractBuilder(this.spec, this.basePath, this.options);
      // Set specific generator options
    const filteredOptions = { ...this.options };
    this.generatorTypes.forEach(type => {
      (filteredOptions as any)[type] = true;
    });

    builder.setOptions(filteredOptions);
    const generated = builder.generate();
    builder.saveFiles(this.fileSystem);

    return {
      success: true,
      generatedFiles: generated,
      errors: [],
      statistics: {
        totalFiles: generated.size,
        typesCount: 0, // Will be calculated by strategy
        schemasCount: 0,
        servicesCount: 0,
        hooksCount: 0,
        componentsCount: 0,
        mocksCount: 0,
        fakesCount: 0,
        viewsCount: 0,
        executionTime: 0
      }
    };
  }

  getDescription(): string {
    return `Generate ${this.generatorTypes.join(', ')} from OpenAPI spec`;
  }
}

/**
 * Command to generate all types
 */
export class GenerateAllCommand extends BaseCommand {
  async execute(): Promise<GenerationResult> {
    const { APIContractBuilder: APIContractBuilder } = await import('../APIContractBuilder.js');
    const builder = new APIContractBuilder(this.spec, this.basePath, {
      types: true,
      schemas: true,
      services: true,
      views: true,
      hooks: this.options.hooks || false,
      components: this.options.components || false,
      mocks: this.options.mocks || false,
      fakesData: this.options.fakesData || false
    });

    const generated = builder.generate();
    builder.saveFiles(this.fileSystem);

    return {
      success: true,
      generatedFiles: generated,
      errors: [],
      statistics: {
        totalFiles: generated.size,
        typesCount: 0, // Will be calculated by strategy
        schemasCount: 0,
        servicesCount: 0,
        hooksCount: 0,
        componentsCount: 0,
        mocksCount: 0,
        fakesCount: 0,
        viewsCount: 0,
        executionTime: 0
      }
    };
  }

  getDescription(): string {
    return 'Generate all available code from OpenAPI spec';
  }
}

/**
 * Command invoker that manages command execution
 */
export class CommandInvoker {
  private commands: Command[] = [];
  private currentCommand: number = -1;

  addCommand(command: Command): void {
    // Remove any commands after current position
    this.commands = this.commands.slice(0, this.currentCommand + 1);
    this.commands.push(command);
    this.currentCommand++;
  }

  async executeCommand(): Promise<GenerationResult> {
    if (this.currentCommand >= 0 && this.currentCommand < this.commands.length) {
      const command = this.commands[this.currentCommand];
      console.log(`Executing: ${command.getDescription()}`);
      return await command.execute();
    }
    throw new Error('No command to execute');
  }

  async undoCommand(): Promise<void> {
    if (this.currentCommand >= 0) {
      const command = this.commands[this.currentCommand];
      if (command.undo) {
        await command.undo();
        this.currentCommand--;
      } else {
        throw new Error('Command does not support undo operation');
      }
    }
  }

  getCommandHistory(): string[] {
    return this.commands.map(cmd => cmd.getDescription());
  }
}
