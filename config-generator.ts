#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Configuration script to customize generator templates and settings
 * 
 * This script will:
 * 1. Take custom configurations as input
 * 2. Override default templates and settings in config.json
 * 3. Run the build process
 */

interface ConfigOptions {
  templates?: {
    form?: {
      template?: string;  // Path to custom form template
      metadata?: string;  // Path to custom form template metadata
    };
    list?: {
      template?: string;  // Path to custom list template
      metadata?: string;  // Path to custom list template metadata
    };
    hook?: {
      template?: string;  // Path to custom hook template
      metadata?: string;  // Path to custom hook template metadata
    };
    service?: {
      template?: string;  // Path to custom service template
      metadata?: string;  // Path to custom service template metadata
    };
    view?: {
      template?: string;  // Path to custom view template
      metadata?: string;  // Path to custom view template metadata
    };
    mock?: {
      template?: string;  // Path to custom mock template
      metadata?: string;  // Path to custom mock template metadata
    };
    fakeData?: {
      template?: string;  // Path to custom fakeData template
      metadata?: string;  // Path to custom fakeData template metadata
    };
  };
  paths?: {
    types?: string;
    schemas?: string;
    services?: string;
    hooks?: string;
    components?: string;
    views?: string;
    mocks?: string;
    fakesData?: string;
  };
  outputDir?: string;     // Custom output directory
  apiSpec?: string;       // Custom API spec path
  options?: any;          // Generator options
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: ConfigOptions = {};

// Define the config file path - either provided or default
let configFilePath = 'custom-config.json';

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--config' && i + 1 < args.length) {
    configFilePath = args[i + 1];
    i++;
  } else if (arg === '--output' && i + 1 < args.length) {
    options.outputDir = args[i + 1];
    i++;
  } else if (arg === '--spec' && i + 1 < args.length) {
    options.apiSpec = args[i + 1];
    i++;
  } else if (arg === '--help' || arg === '-h') {
    console.log('Usage: node config-generator.js [options]');
    console.log('Options:');
    console.log('  --config <path>     Path to custom config JSON file');
    console.log('  --output <path>     Custom output directory');
    console.log('  --spec <path>       Path to API specification file');
    console.log('  --help, -h          Show this help message');
    process.exit(0);
  }
}

// Try to load the custom config file if it exists
if (fs.existsSync(configFilePath)) {
  try {
    const customConfig = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
    
    // Merge with command line options (command line takes precedence)
    options.templates = customConfig.templates;
    options.paths = customConfig.paths;
    options.options = customConfig.options;
    options.outputDir = options.outputDir || customConfig.outputDir;
    options.apiSpec = options.apiSpec || customConfig.apiSpec;
    
    console.log(`Loaded configuration from ${configFilePath}`);
  } catch (error) {
    console.error(`Error loading config file: ${error.message}`);
    process.exit(1);
  }
}

// Load existing config
const defaultConfigPath = path.join(__dirname, 'config.json');
let defaultConfig: any = {};

try {
  if (fs.existsSync(defaultConfigPath)) {
    defaultConfig = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf8'));
  }
} catch (error) {
  console.error(`Error loading default config: ${error.message}`);
  process.exit(1);
}

// Apply custom output and spec paths if provided
if (options.outputDir) {
  defaultConfig.output = defaultConfig.output || {};
  defaultConfig.output.default = options.outputDir;
  console.log(`Set output directory to: ${options.outputDir}`);
}

if (options.apiSpec) {
  defaultConfig.spec = defaultConfig.spec || {};
  defaultConfig.spec.default = options.apiSpec;
  console.log(`Set API specification path to: ${options.apiSpec}`);
}

// Apply custom paths if provided
if (options.paths) {
  defaultConfig.paths = {
    ...defaultConfig.paths,
    ...options.paths
  };
  console.log('Updated path configurations');
}

// Apply custom options if provided
if (options.options) {
  defaultConfig.options = {
    ...defaultConfig.options,
    ...options.options
  };
  console.log('Updated generator options');
}

// Apply custom templates if provided
if (options.templates) {
  // Process each template type
  Object.entries(options.templates).forEach(([templateType, templateConfig]) => {
    if (!templateConfig) return;
    
    const { template: templatePath, metadata: metadataPath } = templateConfig as any;
    
    // Handle template file
    if (templatePath && fs.existsSync(templatePath)) {
      try {
        const templateContent = fs.readFileSync(templatePath, 'utf8');
        const targetFile = path.join(__dirname, 'src', 'templates', `${templateType}.template.ts`);
        
        if (fs.existsSync(targetFile)) {
          fs.writeFileSync(targetFile, templateContent);
          console.log(`Updated ${templateType} template from ${templatePath}`);
        } else {
          console.warn(`Target template file not found: ${targetFile}`);
        }
      } catch (error) {
        console.error(`Error updating ${templateType} template: ${error.message}`);
      }
    }
    
    // Handle template metadata
    if (metadataPath && fs.existsSync(metadataPath)) {
      try {
        const metadataContent = fs.readFileSync(metadataPath, 'utf8');
        const targetMetadataFile = path.join(__dirname, 'src', 'templates', `${templateType}.metadata.ts`);
        
        if (fs.existsSync(targetMetadataFile)) {
          fs.writeFileSync(targetMetadataFile, metadataContent);
          console.log(`Updated ${templateType} metadata from ${metadataPath}`);
        } else {
          console.warn(`Target metadata file not found: ${targetMetadataFile}`);
        }
      } catch (error) {
        console.error(`Error updating ${templateType} metadata: ${error.message}`);
      }
    }
    
    // Update the config.json templates entry
    defaultConfig.templates[templateType] = `src/templates/${templateType}.template.ts`;
  });
}

// Save the updated config
fs.writeFileSync(defaultConfigPath, JSON.stringify(defaultConfig, null, 2));
console.log(`Updated configuration saved to ${defaultConfigPath}`);

// Run the build process
console.log('Building the generator...');
try {
  execSync('npm run build:prod', { stdio: 'inherit' });
  console.log('Build completed successfully!');
} catch (error) {
  console.error(`Build failed: ${error.message}`);
  process.exit(1);
}
