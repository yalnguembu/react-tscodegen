/**
 * Example demonstrating the new OOP approach
 * This shows how to use the refactored API contract generator
 */

import { load as yamlLoad } from 'js-yaml';
import fs from 'fs';
import { OpenApiSpec } from './src/types.js';
import { ApiContractBuilderDirector } from './src/core/builder-pattern.js';
import { ServiceLocator } from './src/core/dependency-injection.js';
import { CommandInvoker, GenerateAllCommand } from './src/core/command-pattern.js';
import { SequentialGenerationStrategy, ParallelGenerationStrategy } from './src/core/generation-strategy.js';
import { LoggingObserver } from './src/enhanced-base-generator.js';

async function demonstrateOOPApproach() {
  console.log('=== API Contract Generator - OOP Approach Demo ===\n');

  // Load OpenAPI specification
  const specContent = fs.readFileSync('./api-specification.yaml', 'utf8');
  const apiSpec = yamlLoad(specContent) as OpenApiSpec;

  console.log('1. Using Builder Pattern for different configurations:\n');

  // Example 1: Frontend Development Configuration
  console.log('📱 Frontend Development Configuration:');
  const frontendBuilder = ApiContractBuilderDirector
    .createForFrontendDevelopment(apiSpec, './output/frontend')
    .setVerbose(true)
    .build();

  // Example 2: Backend Testing Configuration
  console.log('\n🧪 Backend Testing Configuration:');
  const testingBuilder = ApiContractBuilderDirector
    .createForBackendTesting(apiSpec, './output/testing')
    .useParallelStrategy()
    .build();

  // Example 3: Custom Configuration using Fluent Interface
  console.log('\n⚙️ Custom Configuration:');
  const customBuilder = new ApiContractBuilderDirector(apiSpec)
    .setBasePath('./output/custom')
    .enableTypes()
    .enableServices()
    .enableHooks()
    .useSequentialStrategy()
    .setVerbose(true)
    .build();

  console.log('\n2. Using Dependency Injection:\n');

  // Get service locator and register custom services
  const serviceLocator = ServiceLocator.getInstance();
  
  // Register custom generation strategy
  serviceLocator.registerService('customStrategy', () => new ParallelGenerationStrategy());
  
  console.log('✅ Custom services registered');

  console.log('\n3. Using Command Pattern for execution:\n');

  // Create command invoker
  const commandInvoker = new CommandInvoker();
  
  // Create file system instance
  const fileSystem = serviceLocator.getFileSystem();
  
  // Add commands to the invoker
  const generateAllCommand = new GenerateAllCommand(
    apiSpec, 
    './output/command-pattern', 
    { types: true, services: true, hooks: true },
    fileSystem
  );
  
  commandInvoker.addCommand(generateAllCommand);
  
  console.log('💼 Command added to invoker');

  console.log('\n4. Using Observer Pattern for logging:\n');

  // Create observers
  const loggingObserver = new LoggingObserver(true);
  
  // Add observers to generators
  const generators = frontendBuilder.getAvailableGenerators();
  generators.forEach(generatorName => {
    const generator = frontendBuilder.getGenerator(generatorName);
    if (generator) {
      generator.addObserver(loggingObserver);
    }
  });
  
  console.log('👁️ Observers attached to generators');

  console.log('\n5. Using Strategy Pattern for different generation approaches:\n');

  // Demonstrate sequential vs parallel strategies
  console.log('🔄 Sequential Generation Strategy:');
  const sequentialBuilder = new ApiContractBuilderDirector(apiSpec)
    .setBasePath('./output/sequential')
    .enableTypes()
    .enableServices()
    .useSequentialStrategy()
    .build();

  console.log('⚡ Parallel Generation Strategy:');
  const parallelBuilder = new ApiContractBuilderDirector(apiSpec)
    .setBasePath('./output/parallel')
    .enableTypes()
    .enableServices()
    .useParallelStrategy()
    .build();

  console.log('\n6. Advanced Usage Examples:\n');

  // Custom generator example
  console.log('🔧 Adding custom generator:');
  customBuilder.addCustomGenerator('custom', frontendBuilder.getGenerator('types')!);
  console.log('✅ Custom generator added');

  // Command history example
  console.log('\n📜 Command History:');
  const history = commandInvoker.getCommandHistory();
  history.forEach((command, index) => {
    console.log(`  ${index + 1}. ${command}`);
  });

  console.log('\n7. Factory Pattern Benefits:\n');
  console.log('🏭 Generators are created through factories, ensuring:');
  console.log('   - Consistent initialization');
  console.log('   - Dependency injection');
  console.log('   - Easy extension and customization');
  console.log('   - Better testability');

  console.log('\n8. Key OOP Benefits Achieved:\n');
  console.log('✨ Encapsulation: Each generator encapsulates its logic');
  console.log('🧬 Inheritance: Common functionality in base classes');
  console.log('🔄 Polymorphism: Different generators implement same interface');
  console.log('📋 Abstraction: Complex operations hidden behind simple interfaces');
  console.log('🎯 Single Responsibility: Each class has one clear purpose');
  console.log('🔓 Open/Closed: Easy to extend without modifying existing code');
  console.log('🔄 Strategy: Runtime selection of algorithms');
  console.log('🏗️ Builder: Complex object construction simplified');
  console.log('📢 Observer: Loose coupling for event handling');
  console.log('💉 Dependency Injection: Better testability and flexibility');

  console.log('\n=== Demo Complete ===');
  console.log('\nThe refactored code now follows solid OOP principles and design patterns!');
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateOOPApproach().catch(console.error);
}

export { demonstrateOOPApproach };
