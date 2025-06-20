#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { load as yamlLoad } from 'js-yaml';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the equivalent of __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import type { OpenApiSpec } from './src/types.js';
import { ApiContractBuilderDirector } from './src/core/BuilderPattern.js';
import { CommandInvoker, GenerateCommand, GenerateAllCommand } from './src/core/CommandPattern.js';
import { ServiceLocator } from './src/core/DependencyInjection.js';

/**
 * Displays the current version of the generator
 */
async function displayVersion() {
  try {
    // Read package.json to get the version correctly
    // Handle both development and production paths
    let packageJsonPath = path.resolve(__dirname, 'package.json');
    
    // If file doesn't exist at this path (e.g., when running from dist), try the parent directory
    if (!fs.existsSync(packageJsonPath)) {
      packageJsonPath = path.resolve(__dirname, '../package.json');
    }
    
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
      console.log(`API Contract Generator v${packageJson.version}`);
    console.log('A TypeScript code generator for OpenAPI specifications');
    console.log('Enhanced with Object-Oriented Programming patterns');
    console.log('https://github.com/yalnguembu/react-tscodegen');
  } catch (error) {
    console.error('Error reading version information:', error);
    console.error(`Looked for package.json at: ${__dirname}`);
  }
}

async function main() {
  // Check if the first argument is 'version'
  if (process.argv.includes('version')) {
    await displayVersion();
    return;
  }
    // Parse command line arguments
  const argv = await yargs(hideBin(process.argv))
    .usage('Usage: $0 <command> --spec <path-to-spec-file> --outDir <output-directory>')
    .command('services', 'Generate API service classes from OpenAPI paths')
    .command('schemas', 'Generate Zod schemas from OpenAPI schemas')
    .command('hooks', 'Generate React Query hooks from API services')
    .command('components', 'Generate React components (forms and lists) from OpenAPI schemas')
    .command('views', 'Generate view helper classes from OpenAPI schemas')
    .command('mocks', 'Generate API mock services from OpenAPI paths')
    .command('fakes-data', 'Generate fake data generators from OpenAPI schemas')
    .command('all', 'Generate all of the above (default if no command specified)')
    .options({
      spec: {
        alias: 's',
        describe: 'Path to the OpenAPI specification file (YAML or JSON)',
        type: 'string',
        demandOption: true
      },
      outDir: {
        alias: 'o',
        describe: 'Output directory for generated files',
        type: 'string',
        default: './src'
      },
      hooks: {
        describe: 'Generate React Query hooks for API services',
        type: 'boolean',
        default: false
      },
      components: {
        describe: 'Generate React components (forms and lists)',
        type: 'boolean',
        default: false
      },
      verbose: {
        alias: 'v',
        describe: 'Show verbose output',
        type: 'boolean',
        default: false
      }
    })
    .example('$0 services --spec api-specification.yaml --outDir ./src', 'Generate only API services')
    .example('$0 all --spec api-specification.yaml --outDir ./src --hooks --components', 'Generate everything including hooks and components')
    .help()
    .argv;
  try {
    // Get the command - first positional argument
    const command = hideBin(process.argv)[0] || 'all';
    const { spec: specPath, outDir, verbose, hooks, components } = argv;
    
    if (verbose) console.log(`Loading spec from: ${specPath}`);
    
    // Read and parse the OpenAPI spec file
    const specContent = fs.readFileSync(specPath, 'utf8');    
    let apiSpec: OpenApiSpec;
    
    if (specPath.endsWith('.yaml') || specPath.endsWith('.yml')) {
      apiSpec = yamlLoad(specContent) as OpenApiSpec;
    } else if (specPath.endsWith('.json')) {
      apiSpec = JSON.parse(specContent);
    } else {
      throw new Error('Spec file must be YAML or JSON format (.yaml, .yml, or .json)');
    }
      if (verbose) {
      console.log('Spec loaded successfully.');
      console.log(`Command: ${command}`);
      console.log(`Options: hooks=${hooks}, components=${components}`);
      console.log('Generating contract...');
    }

    // Initialize service locator and file system
    const serviceLocator = ServiceLocator.getInstance();
    const { NodeFileSystem } = await import('./src/FileSystem.js');
    const fileSystem = new NodeFileSystem();

    // Set up the options based on the command
    const options: any = {
      hooks: hooks || command === 'hooks',
      components: components || command === 'components',
      mocks: command === 'mocks',
      fakesData: command === 'fakes-data'
    };

    // If the command is 'all', enable all options
    if (command === 'all') {
      options.hooks = true;
      options.components = true;
      options.mocks = true;
      options.fakesData = true;
    }

    // Use Builder Pattern to create the contract builder
    let builderDirector: any;
    
    if (command === 'all') {
      builderDirector = ApiContractBuilderDirector.createFull(apiSpec, outDir);
    } else if (hooks && components) {
      builderDirector = ApiContractBuilderDirector.createForFrontendDevelopment(apiSpec, outDir);
    } else if (command === 'mocks' || command === 'fakes-data') {
      builderDirector = ApiContractBuilderDirector.createForBackendTesting(apiSpec, outDir);
    } else {
      builderDirector = ApiContractBuilderDirector.createMinimal(apiSpec, outDir);
    }

    // Set additional options and build
    const builder = builderDirector
      .setOptions(options)
      .setVerbose(verbose)
      .build();

    // Use Command Pattern for execution
    const commandInvoker = new CommandInvoker();
    
    if (command === 'all') {
      const generateAllCommand = new GenerateAllCommand(apiSpec, outDir, options, fileSystem);
      commandInvoker.addCommand(generateAllCommand);
    } else {
      const generatorTypes = [command];
      const generateCommand = new GenerateCommand(apiSpec, outDir, options, fileSystem, generatorTypes);
      commandInvoker.addCommand(generateCommand);
    }

    // Execute the command
    const result = await commandInvoker.executeCommand();

    if (verbose) {
      console.log('\n=== Generation Statistics ===');
      console.log(`Success: ${result.success}`);
      console.log(`Files generated: ${result.generatedFiles.size}`);      console.log(`Execution time: ${result.statistics.executionTime}ms`);
      if (result.errors.length > 0) {
        console.log('Errors encountered:');
        result.errors.forEach(error => console.log(`  - ${error.message}`));
      }
    }    // Display a message about the requested command
    if (command !== 'all' && command.toLowerCase() !== 'all') {
      console.log(`Selective generation for "${command}" completed successfully.`);
    } else {
      console.log(`Generation complete. Files saved to ${outDir}`);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    process.exit(1);
  }
}

// Run the CLI if this script is executed directly
// In ESM, there's no 'require.main === module' equivalent, 
// so we'll run the main function directly
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
