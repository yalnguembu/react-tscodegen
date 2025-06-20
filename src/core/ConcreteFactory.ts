/**
 * Concrete Factory Implementation
 * Creates specific generator instances
 */
import { GeneratorFactory } from './AbstractFactory.js';
import { BaseGenerator } from '../BaseGenerator.js';
import { TypesGenerator } from '../generators/TypesGenerator.js';
import { SchemasGenerator } from '../generators/SchemasGenerator.js';
import { ServicesGenerator } from '../generators/ServicesGenerator.js';
import { HooksGenerator } from '../generators/HooksGenerator.js';
import { ComponentsGenerator } from '../generators/ComponentsGenerator.js';
import { ViewsGenerator } from '../generators/ViewsGenerator.js';
import { MocksGenerator } from '../generators/MocksGenerator.js';
import { FakesDataGenerator } from '../generators/FakesDataGenerator.js';

export class ConcreteGeneratorFactory extends GeneratorFactory {
  createTypesGenerator(): BaseGenerator {
    return new TypesGenerator(this.spec, this.basePath);
  }

  createSchemasGenerator(): BaseGenerator {
    return new SchemasGenerator(this.spec, this.basePath);
  }

  createServicesGenerator(): BaseGenerator {
    return new ServicesGenerator(this.spec, this.basePath);
  }

  createHooksGenerator(): BaseGenerator {
    return new HooksGenerator(this.spec, this.basePath);
  }

  createComponentsGenerator(): BaseGenerator {
    return new ComponentsGenerator(this.spec, this.basePath);
  }

  createViewsGenerator(): BaseGenerator {
    return new ViewsGenerator(this.spec, this.basePath);
  }

  createMocksGenerator(): BaseGenerator {
    return new MocksGenerator(this.spec, this.basePath);
  }
  createFakesDataGenerator(): BaseGenerator {
    return new FakesDataGenerator(this.spec, this.basePath);
  }
}
