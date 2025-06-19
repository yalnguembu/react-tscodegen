#!/usr/bin/env node

/**
 * API Contract Generator CLI
 * This script handles verification, building, and running the generator.
 * It generates TypeScript interfaces, Zod schemas, API services, React hooks, and React components.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Configuration
const DEFAULT_SPEC_PATH = '../../api-specification.yaml';
const DEFAULT_OUTPUT_PATH = '../src';

// Get script directory (ES Modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(__filename);

// Process command line arguments
const args = process.argv.slice(2);
let specPath = DEFAULT_SPEC_PATH;
let outputPath = DEFAULT_OUTPUT_PATH;
let generateHooks = false;
let generateComponents = false;
let hooksPath = '';
let componentsPath = '';

// Parse command line arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--spec' && i + 1 < args.length) {
    specPath = args[i + 1];
    i++;
  } else if (args[i] === '--output' && i + 1 < args.length) {
    outputPath = args[i + 1];
    i++;
  } else if (args[i] === '--hooks') {
    generateHooks = true;
    if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
      hooksPath = args[i + 1];
      i++;
    }
  } else if (args[i] === '--components') {
    generateComponents = true;
    if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
      componentsPath = args[i + 1];
      i++;
    }  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
API Contract Generator
Usage: node generator [command] [options]

Commands:
  services             Generate API service classes from OpenAPI paths
  schemas              Generate Zod schemas from OpenAPI schemas
  hooks                Generate React Query hooks from API services
  components           Generate React components (forms and lists) from OpenAPI schemas
  views                Generate view helper classes from OpenAPI schemas
  mocks                Generate API mock services from OpenAPI paths
  fakes-data           Generate fake data generators from OpenAPI schemas
  all                  Generate all of the above (default if no command specified)

Options:
  --spec <path>            Path to the OpenAPI specification file (YAML or JSON)
  --output <path>          Output directory for generated files
  --hooks [path]           Generate React hooks for API services (optional: specify output directory)
  --components [path]      Generate React components (forms and lists) (optional: specify output directory)
  --forms                  Generate form components (when using --components)
  --list                   Generate list components (when using --components)
  --help, -h               Show this help message
`);
    process.exit(0);
  }
}

// Resolve paths to absolute paths
specPath = path.resolve(scriptDir, specPath);
outputPath = path.resolve(scriptDir, outputPath);

// If hook or component paths are provided, resolve them too
if (hooksPath) {
  hooksPath = path.resolve(scriptDir, hooksPath);
} else if (generateHooks) {
  hooksPath = path.join(outputPath, 'hooks');
}

if (componentsPath) {
  componentsPath = path.resolve(scriptDir, componentsPath);
} else if (generateComponents) {
  componentsPath = path.join(outputPath, 'components');
}

/**
 * Ensure the package.json file exists
 */
const ensurePackageJson = () => {
  const packageJsonPath = path.join(scriptDir, 'package.json');
  const packageGeneratorPath = path.join(scriptDir, 'package.generator.json');

  if (!fs.existsSync(packageJsonPath) && fs.existsSync(packageGeneratorPath)) {
    console.log('Creating package.json from package.generator.json...');
    fs.copyFileSync(packageGeneratorPath, packageJsonPath);
  }
}

/**
 * Check if dependencies need to be installed
 */
const checkAndInstallDependencies = () => {
  const nodeModulesPath = path.join(scriptDir, 'node_modules');
  
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('Installing dependencies...');
    execSync('npm install', { cwd: scriptDir, stdio: 'inherit' });
  } else {
    console.log('Dependencies already installed, skipping npm install.');
  }
}

/**
 * Check if the project needs to be built
 */
const checkAndBuildProject = () => {
  const distPath = path.join(scriptDir, 'dist');
  const indexJsPath = path.join(distPath, 'index.js');
  const bundlePath = path.join(distPath, 'index.bundle.js');
  const srcPath = path.join(scriptDir, 'src');
  
  let needsBuild = false;
  
  // First check if we have the production bundle
  const hasBundleFile = fs.existsSync(bundlePath);
  
  // If bundle exists, we can use that, no need to build
  if (hasBundleFile) {
    console.log('Found bundled version, using production bundle.');
    return bundlePath; // Return the path to the bundle
  }
  
  // Check if dist directory exists
  if (!fs.existsSync(distPath)) {
    console.log('Need to build: dist directory does not exist.');
    needsBuild = true;
  }
  // Check if index.js exists
  else if (!fs.existsSync(indexJsPath)) {
    console.log('Need to build: dist/index.js does not exist.');
    needsBuild = true;
  }
  // Check if source files are newer than dist files
  else {
    const indexStats = fs.statSync(indexJsPath);
    
    // Find the most recently modified source file
    let newestSourceTime = 0;
    const findNewestFile = (dirPath) => {
      const files = fs.readdirSync(dirPath);
      
      files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          findNewestFile(filePath);
        } else if (stat.mtime.getTime() > newestSourceTime) {
          newestSourceTime = stat.mtime.getTime();
        }
      });
    };
    
    findNewestFile(srcPath);
    
    if (newestSourceTime > indexStats.mtime.getTime()) {
      console.log('Need to build: source files are newer than built files.');
      needsBuild = true;
    }
  }
  
  if (needsBuild) {
    console.log('Building the generator...');
    execSync('npm run build', { cwd: scriptDir, stdio: 'inherit' });
  } else {
    console.log('Generator already built, skipping build step.');
  }
  
  return indexJsPath; // Return the path to the regular build
}

/**
 * Run the generator
 */
const runGenerator = () => {
  // Check if the spec file exists
  if (!fs.existsSync(specPath)) {
    console.error(`Error: Specification file not found at: ${specPath}`);
    console.log('Please check the path and try again.');
    process.exit(1);
  }
  
  console.log(`Running generator with spec: ${specPath}`);
  console.log(`Output directory: ${outputPath}`);
  console.log(`Generate hooks: ${generateHooks ? 'Yes' : 'No'}${hooksPath ? ' (path: ' + hooksPath + ')' : ''}`);
  console.log(`Generate components: ${generateComponents ? 'Yes' : 'No'}${componentsPath ? ' (path: ' + componentsPath + ')' : ''}`);

  // Ensure output directories exist
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  
  // If generating hooks, ensure directory exists
  if (generateHooks && hooksPath) {
    if (!fs.existsSync(hooksPath)) {
      fs.mkdirSync(hooksPath, { recursive: true });
    }
  }
  
  // If generating components, ensure directories exist
  if (generateComponents && componentsPath) {
    if (!fs.existsSync(componentsPath)) {
      fs.mkdirSync(componentsPath, { recursive: true });
    }
    
    // Create subdirectories for forms and lists
    const formsDir = path.join(componentsPath, 'forms');
    const listsDir = path.join(componentsPath, 'lists');
    if (!fs.existsSync(formsDir)) {
      fs.mkdirSync(formsDir, { recursive: true });
    }
    if (!fs.existsSync(listsDir)) {
      fs.mkdirSync(listsDir, { recursive: true });
    }
  }
  // Parse command line arguments to determine which subcommand to use
  // By default, use the 'all' command
  let subcommand = 'all';
  
  // Look for specific generator command 
  if (args.includes('services')) {
    subcommand = 'services';
  } else if (args.includes('schemas')) {
    subcommand = 'schemas';
  } else if (args.includes('hooks')) {
    subcommand = 'hooks';
  } else if (args.includes('components')) {
    subcommand = 'components';
  } else if (args.includes('views')) {
    subcommand = 'views';
  } else if (args.includes('mocks')) {
    subcommand = 'mocks';
  } else if (args.includes('fakes-data')) {
    subcommand = 'fakes-data';
  }
  
  console.log(`Using generator command: ${subcommand}`);
  
  // Get the path to the appropriate generator script (bundle or regular build)
  const generatorPath = checkAndBuildProject();
    // Build command string with optional parameters
  let command = `node --experimental-specifier-resolution=node "${generatorPath}" ${subcommand} --spec "${specPath}" --output "${outputPath}"`;
  if (generateHooks) {
    command += ' --hooks';
    if (hooksPath) {
      command += ` "${hooksPath}"`;
    }
  }
  
  if (generateComponents) {
    command += ' --components';
    if (componentsPath) {
      command += ` "${componentsPath}"`;
    }
    
    // Check for --forms and --list flags
    if (args.includes('--forms')) {
      command += ' --forms';
    }
    
    if (args.includes('--list')) {
      command += ' --list';
    }
  }
  
  try {
    execSync(command, { 
      cwd: scriptDir, 
      stdio: 'inherit' 
    });
  } catch (error) {
    console.error('Error running generator:', error.message);
    process.exit(1);
  }
}

// Main function
const main = () => {
  console.log('API Contract Generator for Federation Licensing & Management Platform');
  console.log('============================================================');
  
  try {
    ensurePackageJson();
    checkAndInstallDependencies();
    checkAndBuildProject();
    runGenerator();
    
    console.log('============================================================');
    console.log('Done! Generator completed successfully.');
  } catch (error) {
    console.error('Generator failed with error:', error.message);
    process.exit(1);
  }
};

// Run the main function
main();
