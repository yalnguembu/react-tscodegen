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
import { ApiContractBuilder } from './src/api-contract-builder.js';

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
  const argv = await yargs(hideBin(process.argv))    .usage('Usage: $0 --spec <path-to-spec-file> --outDir <output-directory>')
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
      verbose: {
        alias: 'v',
        describe: 'Show verbose output',
        type: 'boolean',
        default: false
      }
    })
    .example('$0 --spec api-specification.yaml --outDir ./src', 'Generate API contract from the given spec')
    .help()
    .argv;

  try {
    const { spec: specPath, outDir, verbose } = argv;
    
    if (verbose) console.log(`Loading spec from: ${specPath}`);
    
    // Read and parse the OpenAPI spec file
    const specContent = fs.readFileSync(specPath, 'utf8');    let apiSpec: OpenApiSpec;
    
    if (specPath.endsWith('.yaml') || specPath.endsWith('.yml')) {
      apiSpec = yamlLoad(specContent) as OpenApiSpec;
    } else if (specPath.endsWith('.json')) {
      apiSpec = JSON.parse(specContent);
    } else {
      throw new Error('Spec file must be YAML or JSON format (.yaml, .yml, or .json)');
    }
    if (verbose) console.log('Spec loaded successfully. Generating contract...');
    
    // Generate the API contract
    const builder = new ApiContractBuilder(apiSpec, outDir);
    const generatedCode = builder.generate();
    
    // Create a file system instance and save the generated files
    const { NodeFileSystem } = await import('./src/file-system.js');
    const fileSystem = new NodeFileSystem();
    builder.saveFiles(fileSystem);
    
    if (verbose) {
      console.log(`\nGeneration complete. Files saved to ${outDir}`);
      // Count types, schemas, and services based on their file paths or naming conventions
      const typesCount = [...generatedCode.keys()].filter(key => key.includes('type') || key.endsWith('dto')).length;
      const schemasCount = [...generatedCode.keys()].filter(key => key.includes('schema')).length;
      const servicesCount = [...generatedCode.keys()].filter(key => key.includes('service')).length;
      
      console.log(`Generated ${typesCount} types`);
      console.log(`Generated ${schemasCount} schemas`);
      console.log(`Generated ${servicesCount} services`);
    } else {
      console.log(`Generation complete. Files saved to ${outDir}`);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
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
