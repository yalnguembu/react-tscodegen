#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { load as yamlLoad } from 'js-yaml';
import { ApiContractBuilder } from './api-contract-builder.js';
import { NodeFileSystem } from './file-system.js';
import { GeneratorOptions, OpenApiSpec } from './types.js';
import { TypesGenerator } from './generators/types-generator.js';
import { SchemasGenerator } from './generators/schemas-generator.js';
import { ServicesGenerator } from './generators/services-generator.js';
import { HooksGenerator } from './generators/hooks-generator.js';
import { ComponentsGenerator } from './generators/components-generator.js';
import { ViewsGenerator } from './generators/views-generator.js';
import { MocksGenerator } from './generators/mocks-generator.js';
import { FakesDataGenerator } from './generators/fakes-data-generator.js';

// Get the equivalent of __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define config interface
interface GeneratorConfig {
  spec?: {
    default: string;
    description: string;
  };
  output?: {
    default: string;
    description: string;
  };
  paths?: {
    [key: string]: {
      default: string;
      description: string;
    };
  };
  components?: {
    [key: string]: {
      default: string;
      description: string;
    };
  };
  templates?: {
    [key: string]: {
      path: string;
      extension: string;
      indexImportPattern: string;
      importStatements: string[];
    };
  };
  options?: {
    typesGeneration?: {
      enumAsUnion: boolean;
      generateInterfaces: boolean;
      includeDescriptions: boolean;
    };
    schemasGeneration?: {
      addTypeAnnotations: boolean;
      generateSchemaExports: boolean;
    };
    servicesGeneration?: {
      useAxios: boolean;
      includeComments: boolean;
      addTypeAnnotations: boolean;
    };
    hooksGeneration?: {
      useReactQuery: boolean;
      includeInfiniteQueries: boolean;
      includeMutations: boolean;
      servicesInputPath: string | null;
    };
    componentsGeneration?: {
      useReactHookForm: boolean;
      generateForms: boolean;
      generateLists: boolean;
      includeFormValidation: boolean;
    };
    viewsGeneration?: {
      generateHelpers: boolean;
      includeFormatters: boolean;
    };
  };
}

const program = new Command();

program
  .name('generate-api')
  .description('API Contract Generator for Federation Licensing & Management Platform')
  .version('0.0.1');

// Load config
let config: GeneratorConfig = {};
try {
  const configPath = path.resolve(__dirname, '../config.json');
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (error) {
  console.error('Error loading config file:', error);
}

program
  .name('generate-api')
  .description('API Contract Generator for OpenAPI specifications')
  .version('0.0.1');

program
  .command('all')
  .description('Generate all API contracts (types, schemas, services, hooks, components)')
  .option('-s, --spec <path>', 'Path to the OpenAPI specification file (YAML or JSON)', config.spec?.default)
  .option('-o, --output <directory>', 'Output directory for generated files', config.output?.default)
  .option('--hooks [path]', 'Generate React hooks for API services (specify output path or use default)')
  .option('--components [path]', 'Generate React components (forms and lists) (specify output path or use default)')
  .action(async (options) => {
    await generateAll(options);
  });

program
  .command('types')
  .description('Generate TypeScript types from OpenAPI schemas')
  .option('-s, --spec <path>', 'Path to the OpenAPI specification file (YAML or JSON)', config.spec?.default)
  .option('-o, --output <directory>', 'Output directory for generated types', config.output?.default)
  .action(async (options) => {
    await generateTypes(options);
  });

program
  .command('schemas')
  .description('Generate Zod schemas from OpenAPI schemas')
  .option('-s, --spec <path>', 'Path to the OpenAPI specification file (YAML or JSON)', config.spec?.default)
  .option('-o, --output <directory>', 'Output directory for generated schemas', config.output?.default)
  .action(async (options) => {
    await generateSchemas(options);
  });

program
  .command('services')
  .description('Generate API service classes from OpenAPI paths')
  .option('-s, --spec <path>', 'Path to the OpenAPI specification file (YAML or JSON)', config.spec?.default)
  .option('-o, --output <directory>', 'Output directory for generated services', config.output?.default)
  .action(async (options) => {
    await generateServices(options);
  });

program
  .command('hooks')
  .description('Generate React Query hooks from API services')
  .option('-s, --spec <path>', 'Path to the OpenAPI specification file', config.spec?.default)
  .option('-o, --output <directory>', 'Output directory for generated hooks', config.output?.default)  .option('-i, --input <directory>', 'Input directory containing service files (optional)', 
    config.options?.hooksGeneration?.servicesInputPath || undefined)
  .action(async (options) => {
    await generateHooks(options);
  });

program
  .command('components')
  .description('Generate React components (forms and lists) from OpenAPI schemas')
  .option('-s, --spec <path>', 'Path to the OpenAPI specification file (YAML or JSON)', config.spec?.default)
  .option('-o, --output <directory>', 'Output directory for generated components', config.output?.default)
  .option('--forms', 'Generate form components', config.options?.componentsGeneration?.generateForms)
  .option('--list', 'Generate list components', config.options?.componentsGeneration?.generateLists)
  .action(async (options) => {
    await generateComponents(options);
  });

program
  .command('views')
  .description('Generate view helper classes from OpenAPI schemas')
  .option('-s, --spec <path>', 'Path to the OpenAPI specification file (YAML or JSON)', config.spec?.default)
  .option('-o, --output <directory>', 'Output directory for generated views', config.output?.default)
  .action(async (options) => {
    await generateViews(options);
  });

program
  .command('mocks')
  .description('Generate API mock services from OpenAPI paths')
  .option('-s, --spec <path>', 'Path to the OpenAPI specification file (YAML or JSON)', config.spec?.default)
  .option('-o, --output <directory>', 'Output directory for generated mocks', config.output?.default)
  .action(async (options) => {
    await generateMocks(options);
  });

program
  .command('fakes-data')
  .description('Generate fake data generators from OpenAPI schemas')
  .option('-s, --spec <path>', 'Path to the OpenAPI specification file (YAML or JSON)', config.spec?.default)
  .option('-o, --output <directory>', 'Output directory for generated fake data', config.output?.default)
  .action(async (options) => {
    await generateFakesData(options);
  });

program.parse(process.argv);

// If no command provided, show help
if (process.argv.length <= 2) {
  program.help();
}

// Helper function to load OpenAPI spec
async function loadSpec(specPath: string): Promise<OpenApiSpec> {
  try {    const resolvedPath = path.resolve(specPath);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`Error: Specification file not found at: ${resolvedPath}`);
      console.log('Please check the path and try again.');
      process.exit(1);
    }

    console.log(`Reading specification from: ${resolvedPath}`);
    const specContent = fs.readFileSync(resolvedPath, 'utf8');
    
    // Parse based on file extension
    if (resolvedPath.endsWith('.yaml') || resolvedPath.endsWith('.yml')) {
      return yamlLoad(specContent) as OpenApiSpec;
    } else {
      return JSON.parse(specContent) as OpenApiSpec;
    }
  } catch (error) {
    console.error('Error loading or parsing specification:', error);
    process.exit(1);
  }
}

// Helper function to safely resolve output path
function resolveOutputPath(outputOption: string | undefined): string {
  return path.resolve(outputOption || config.output?.default || './frontend/src');
}

// Generator functions
async function generateAll(options: GeneratorOptions) {
  const specPath = options.spec || config.spec?.default;
  if (!specPath) {
    console.error('Error: No specification file provided');
    console.log('Please specify a path to your OpenAPI spec file with --spec');
    process.exit(1);
  }
  const outputPath = resolveOutputPath(options.output);
  console.log(`Output directory: ${outputPath}`);
  
  console.log('Generating all API contracts...');
  console.log('- Generating types');
  console.log('- Generating schemas');
  console.log('- Generating services');
  console.log('- Generating views');
  console.log('- Generating hooks');
  console.log('- Generating components');
  console.log('- Generating fake data generators');
  console.log('- Generating API mocks');
  
  const spec = await loadSpec(specPath);
  const fs = new NodeFileSystem();
  
  // Generate types
  const typesGenerator = new TypesGenerator(spec, outputPath);
  typesGenerator.generate();
  typesGenerator.saveFiles(fs);
  console.log('✓ Types generated');
  
  // Generate schemas
  const schemasGenerator = new SchemasGenerator(spec, outputPath);
  schemasGenerator.generate();
  schemasGenerator.saveFiles(fs);
  console.log('✓ Schemas generated');
  
  // Generate services
  const servicesGenerator = new ServicesGenerator(spec, outputPath);
  servicesGenerator.generate();
  servicesGenerator.saveFiles(fs);
  console.log('✓ Services generated');
  
  // Generate views
  const viewsGenerator = new ViewsGenerator(spec, outputPath);
  viewsGenerator.generate();
  viewsGenerator.saveFiles(fs);
  console.log('✓ Views generated');
  
  // Generate hooks
  const hooksGenerator = new HooksGenerator(spec, outputPath);
  hooksGenerator.generate();
  hooksGenerator.saveFiles(fs);
  console.log('✓ Hooks generated');
  
  // Generate components
  const componentsGenerator = new ComponentsGenerator(spec, outputPath, {
    generateForms: true,
    generateLists: true
  });
  componentsGenerator.generate();
  componentsGenerator.saveFiles(fs);
  console.log('✓ Components generated');
  
  // Generate fake data
  const fakesDataGenerator = new FakesDataGenerator(spec, outputPath);
  fakesDataGenerator.generate();
  fakesDataGenerator.saveFiles(fs);
  console.log('✓ Fake data generators generated');
  
  // Generate mocks
  const mocksGenerator = new MocksGenerator(spec, outputPath);
  mocksGenerator.generate();
  mocksGenerator.saveFiles(fs);
  console.log('✓ API mocks generated');
  
  console.log('All generation complete!');
}

async function generateTypes(options: GeneratorOptions) {
  const specPath = options.spec || config.spec?.default;
  if (!specPath) {
    console.error('Error: No specification file provided');
    process.exit(1);
  }
  
  const outputPath = resolveOutputPath(options.output);
  console.log(`Generating types in: ${outputPath}`);
  
  const spec = await loadSpec(specPath);
  const fs = new NodeFileSystem();
  
  const typesGenerator = new TypesGenerator(spec, outputPath);
  typesGenerator.generate();
  typesGenerator.saveFiles(fs);
  
  console.log('Types generation complete!');
}

async function generateSchemas(options: GeneratorOptions) {
  const specPath = options.spec || config.spec?.default;
  if (!specPath) {
    console.error('Error: No specification file provided');
    process.exit(1);
  }
  
  const outputPath = resolveOutputPath(options.output);
  console.log(`Generating schemas in: ${outputPath}`);
  
  const spec = await loadSpec(specPath);
  const fs = new NodeFileSystem();
  
  const schemasGenerator = new SchemasGenerator(spec, outputPath);
  schemasGenerator.generate();
  schemasGenerator.saveFiles(fs);
  
  console.log('Schemas generation complete!');
}

async function generateServices(options: GeneratorOptions) {
  const specPath = options.spec || config.spec?.default;
  if (!specPath) {
    console.error('Error: No specification file provided');
    process.exit(1);
  }
  
  const outputPath = resolveOutputPath(options.output);
  console.log(`Generating services in: ${outputPath}`);
  
  const spec = await loadSpec(specPath);
  const fs = new NodeFileSystem();
  
  const servicesGenerator = new ServicesGenerator(spec, outputPath);
  servicesGenerator.generate();
  servicesGenerator.saveFiles(fs);
  
  console.log('Services generation complete!');
}

async function generateHooks(options: GeneratorOptions) {
  const specPath = options.spec || config.spec?.default;
  if (!specPath) {
    console.error('Error: No specification file provided');
    process.exit(1);
  }
  
  const outputPath = resolveOutputPath(options.output);
  console.log(`Generating hooks in: ${outputPath}`);
  
  const spec = await loadSpec(specPath);
  const fs = new NodeFileSystem();
  
  const hooksGenerator = new HooksGenerator(spec, outputPath);
  
  // If an input directory is specified, load service files from there
  if (options.input) {
    console.log(`Loading services from: ${options.input}`);
    const servicesPath = path.resolve(options.input);
    hooksGenerator.loadServicesFromDirectory(servicesPath, fs);
  }
  
  hooksGenerator.generate();
  hooksGenerator.saveFiles(fs);
  
  console.log('Hooks generation complete!');
}

async function generateComponents(options: GeneratorOptions) {
  const specPath = options.spec || config.spec?.default;
  if (!specPath) {
    console.error('Error: No specification file provided');
    process.exit(1);
  }
  
  const outputPath = resolveOutputPath(options.output);
  console.log(`Generating components in: ${outputPath}`);
  
  // Determine which component types to generate
  const generateForms = options.forms !== undefined ? options.forms : true;
  const generateLists = options.list !== undefined ? options.list : true;
  
  console.log(`Generating forms: ${generateForms ? 'Yes' : 'No'}`);
  console.log(`Generating lists: ${generateLists ? 'Yes' : 'No'}`);
  
  const spec = await loadSpec(specPath);
  const fs = new NodeFileSystem();
  
  const componentsGenerator = new ComponentsGenerator(spec, outputPath, {
    generateForms,
    generateLists
  });
  componentsGenerator.generate();
  componentsGenerator.saveFiles(fs);
  
  console.log('Components generation complete!');
}

async function generateViews(options: GeneratorOptions) {
  const specPath = options.spec || config.spec?.default;
  if (!specPath) {
    console.error('Error: No specification file provided');
    process.exit(1);
  }
  
  const outputPath = resolveOutputPath(options.output);
  console.log(`Generating views in: ${outputPath}`);
  
  const spec = await loadSpec(specPath);
  const fs = new NodeFileSystem();
  
  const viewsGenerator = new ViewsGenerator(spec, outputPath);
  viewsGenerator.generate();
  viewsGenerator.saveFiles(fs);
  
  console.log('Views generation complete!');
}

async function generateMocks(options: GeneratorOptions) {
  const specPath = options.spec || config.spec?.default;
  if (!specPath) {
    console.error('Error: No specification file provided');
    process.exit(1);
  }
  
  const outputPath = resolveOutputPath(options.output);
  console.log(`Generating API mocks in: ${outputPath}`);
  
  const spec = await loadSpec(specPath);
  const fs = new NodeFileSystem();
  
  const mocksGenerator = new MocksGenerator(spec, outputPath);
  mocksGenerator.generate();
  mocksGenerator.saveFiles(fs);
  
  console.log('API mocks generation complete!');
}

async function generateFakesData(options: GeneratorOptions) {
  const specPath = options.spec || config.spec?.default;
  if (!specPath) {
    console.error('Error: No specification file provided');
    process.exit(1);
  }
  
  const outputPath = resolveOutputPath(options.output);
  console.log(`Generating fake data generators in: ${outputPath}`);
  
  const spec = await loadSpec(specPath);
  const fs = new NodeFileSystem();
  
  const fakesDataGenerator = new FakesDataGenerator(spec, outputPath);
  fakesDataGenerator.generate();
  fakesDataGenerator.saveFiles(fs);
  
  console.log('Fake data generators complete!');
}

// Execute the main function
// Execute the program
program.parse();
