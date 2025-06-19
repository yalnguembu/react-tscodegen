import { BaseGenerator } from './base-generator.js';
import { FileSystemAPI } from './file-system.js';
import { TypesGenerator } from './generators/types-generator.js';
import { SchemasGenerator } from './generators/schemas-generator.js';
import { ServicesGenerator } from './generators/services-generator.js';
import { HooksGenerator } from './generators/hooks-generator.js';
import { ComponentsGenerator } from './generators/components-generator.js';
import { ViewsGenerator } from './generators/views-generator.js';
import { GeneratorOptions, OpenApiSpec } from './types.js';

export class ApiContractBuilder extends BaseGenerator {
  private typesGenerator: TypesGenerator;
  private schemasGenerator: SchemasGenerator;
  private servicesGenerator: ServicesGenerator;
  private hooksGenerator: HooksGenerator;
  private componentsGenerator: ComponentsGenerator;
  private viewsGenerator: ViewsGenerator;

  private options: GeneratorOptions;
  
  constructor(spec: OpenApiSpec, basePath: string = './frontend/src', options: GeneratorOptions = {}) {
    super(spec, basePath);
    this.options = options;
    
    // Initialize all generators
    this.typesGenerator = new TypesGenerator(spec, basePath);
    this.schemasGenerator = new SchemasGenerator(spec, basePath);
    this.servicesGenerator = new ServicesGenerator(spec, basePath);
    this.viewsGenerator = new ViewsGenerator(spec, basePath);
    
    // These generators depend on other generators' output
    this.hooksGenerator = new HooksGenerator(spec, basePath);
    this.componentsGenerator = new ComponentsGenerator(spec, basePath);
  }  
  generate(): Map<string, string> {
    // Generate TypeScript types and Zod schemas first as they are dependencies
    const types = this.typesGenerator.generate();
    const schemas = this.schemasGenerator.generate();
    
    // Generate services based on endpoints
    const services = this.servicesGenerator.generate();
    
    // Generate view objects
    const views = this.viewsGenerator.generate();

    // Conditionally generate hooks and components
    let hooks = new Map<string, string>();
    let components = new Map<string, string>();
    
    if (this.options.hooks) {
      hooks = this.hooksGenerator.generate();
    }
    
    if (this.options.components) {
      components = this.componentsGenerator.generate();
    }
    
    // Combine all generated code
    const allGenerated = new Map<string, string>();
    [types, schemas, services, views, hooks, components].forEach(map => {
      for (const [key, value] of map.entries()) {
        allGenerated.set(key, value);
      }
    });
    
    return allGenerated;
  }
  
  saveFiles(fs: FileSystemAPI): void {
    this.typesGenerator.saveFiles(fs);
    this.schemasGenerator.saveFiles(fs);
    this.servicesGenerator.saveFiles(fs);
    this.viewsGenerator.saveFiles(fs);
    
    if (this.options.hooks) {
      this.hooksGenerator.saveFiles(fs);
    }
    
    if (this.options.components) {
      this.componentsGenerator.saveFiles(fs);
    }
  }
}
