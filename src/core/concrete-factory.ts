/**
 * Concrete Factory Implementation
 * Creates specific generator instances
 */
import { GeneratorFactory } from './abstract-factory.js';
import { BaseGenerator } from '../base-generator.js';
import { TypesGenerator } from '../generators/types-generator.js';
import { SchemasGenerator } from '../generators/schemas-generator.js';
import { ServicesGenerator } from '../generators/services-generator.js';
import { HooksGenerator } from '../generators/hooks-generator.js';
import { ComponentsGenerator } from '../generators/components-generator.js';
import { ViewsGenerator } from '../generators/views-generator.js';
import { MocksGenerator } from '../generators/mocks-generator.js';
import { FakesDataGenerator } from '../generators/fakes-data-generator.js';

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
