#!/usr/bin/env node
import { Command } from "commander"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { dirname } from "path"
import { load as yamlLoad } from "js-yaml"
import SwaggerParser from "@apidevtools/swagger-parser"
// import { ApiContractBuilder } from "./APIContractBuilder.js"
import { NodeFileSystem } from "./FileSystem.js"
import { GeneratorOptions, OpenApiSpec } from "./types.js"
import { TypesGenerator } from "./generators/TypesGenerator.js"
import { SchemasGenerator } from "./generators/SchemasGenerator.js"
import { ServicesGenerator } from "./generators/ServicesGenerator.js"
import { HooksGenerator } from "./generators/HooksGenerator.js"
import { ComponentsGenerator } from "./generators/ComponentsGenerator.js"
import { ViewsGenerator } from "./generators/ViewsGenerator.js"
import { MocksGenerator } from "./generators/MocksGenerator.js"
import { FakesDataGenerator } from "./generators/FakesDataGenerator.js"

// Get the equivalent of __dirname in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Define config interface
interface GeneratorConfig {
  spec?: {
    default: string
    description: string
  }
  output?: {
    default: string
    description: string
  }
  paths?: {
    [key: string]: {
      default: string
      description: string
    }
  }
  components?: {
    [key: string]: {
      default: string
      description: string
    }
  }
  templates?: {
    [key: string]: {
      path: string
      extension: string
      indexImportPattern: string
      importStatements: string[]
    }
  }
  options?: {
    typesGeneration?: {
      enumAsUnion: boolean
      generateInterfaces: boolean
      includeDescriptions: boolean
    }
    schemasGeneration?: {
      addTypeAnnotations: boolean
      generateSchemaExports: boolean
    }
    servicesGeneration?: {
      useAxios: boolean
      includeComments: boolean
      addTypeAnnotations: boolean
    }
    hooksGeneration?: {
      useReactQuery: boolean
      includeInfiniteQueries: boolean
      includeMutations: boolean
      servicesInputPath: string | null
    }
    componentsGeneration?: {
      useReactHookForm: boolean
      generateForms: boolean
      generateLists: boolean
      includeFormValidation: boolean
    }
    viewsGeneration?: {
      generateHelpers: boolean
      includeFormatters: boolean
    }
  }
}

interface GenerationCounts {
  types: number
  schemas: number
  services: number
  views: number
  hooks: number
  components: {
    list: number
    createForm: number
    editForm: number
  }
  mocks: number
  fakesData: number
}

interface GeneratorInstance {
  generate(): Map<string, any>
  saveFiles(fs: NodeFileSystem): void
  initializeSpec?(): Promise<void>
}

// Configuration and utility classes
class ConfigManager {
  private config: GeneratorConfig = {}

  constructor() {
    this.loadConfig()
  }

  private loadConfig(): void {
    try {
      const configPath = path.resolve(__dirname, "../config.json")
      if (fs.existsSync(configPath)) {
        this.config = JSON.parse(fs.readFileSync(configPath, "utf8"))
      }
    } catch (error) {
      console.error("Error loading config file:", error)
    }
  }

  getConfig(): GeneratorConfig {
    return this.config
  }

  getSpecDefault(): string | undefined {
    return this.config.spec?.default
  }

  getOutputDefault(): string | undefined {
    return this.config.output?.default
  }
}

class SpecLoader {
  static async load(specPath: string): Promise<OpenApiSpec> {
    try {
      const resolvedPath = path.resolve(specPath)
      if (!fs.existsSync(resolvedPath)) {
        console.error(`Error: Specification file not found at: ${resolvedPath}`)
        console.log("Please check the path and try again.")
        process.exit(1)
      }

      console.log(`Loading and dereferencing OpenAPI spec from: ${resolvedPath}`)
        try {
        // Use swagger-parser to properly parse, validate, and dereference the spec
        const parsedApi = await SwaggerParser.dereference(resolvedPath)
        const api = parsedApi as unknown as OpenApiSpec
        
        console.log(`✅ Successfully loaded and dereferenced OpenAPI spec`)
        console.log(`   📋 Title: ${(api as any).info?.title || 'Unknown'}`)
        console.log(`   🔢 Version: ${(api as any).info?.version || 'Unknown'}`)
        console.log(`   🛣️  Paths: ${Object.keys(api.paths || {}).length}`)
        console.log(`   📦 Schemas: ${Object.keys(api.components?.schemas || {}).length}`)
        
        return api
      } catch (parserError) {
        console.warn(`⚠️  swagger-parser failed: ${parserError}`)
        console.log(`🔄 Falling back to basic YAML/JSON parsing...`)
        
        // Fallback to basic YAML/JSON loading
        const specContent = fs.readFileSync(resolvedPath, "utf8")

        // Parse based on file extension
        if (resolvedPath.endsWith(".yaml") || resolvedPath.endsWith(".yml")) {
          return yamlLoad(specContent) as OpenApiSpec
        } else {
          return JSON.parse(specContent) as OpenApiSpec
        }
      }
    } catch (error) {
      console.error("❌ Error loading or parsing specification:", error)
      process.exit(1)
    }
  }
}

class PathResolver {
  static resolveOutputPath(options: GeneratorOptions, config: GeneratorConfig): string {
    const outputPath = options.outDir || options.output || config.output?.default || "./src"
    return path.resolve(outputPath)
  }
}

class FileDisplayer {
  static displayGeneratedFiles(fs: NodeFileSystem, outputPath: string, commandName: string): void {
    const writtenFiles = fs.getWrittenFiles()
    const filesByDirectory = fs.getWrittenFilesByDirectory()

    console.log(`\n======== Generated Files for '${commandName}' ========`)
    console.log(`Total: ${writtenFiles.length} files`)

    // Display files grouped by directory
    Object.entries(filesByDirectory).forEach(([directory, files]) => {
      console.log(`\n📁 ${directory}`)
      files.forEach((file) => console.log(`  ├─ ${file}`))
    })

    console.log(`\n✅ Generation complete. Files saved to ${outputPath}`)
    console.log(`===============================================`)
  }
}

// Generator factory
class GeneratorFactory {
  static createGenerator(
    type: string,
    spec: OpenApiSpec,
    outputPath: string,
    options?: any
  ): GeneratorInstance {
    switch (type) {
      case 'types':
        return new TypesGenerator(spec, outputPath)
      case 'schemas':
        return new SchemasGenerator(spec, outputPath)
      case 'services':
        return new ServicesGenerator(spec, outputPath)
      case 'views':
        return new ViewsGenerator(spec, outputPath)
      case 'hooks':
        return new HooksGenerator(spec, outputPath)
      case 'components':
        return new ComponentsGenerator(spec, outputPath, options)
      case 'mocks':
        return new MocksGenerator(spec, outputPath)
      case 'fakesData':
        return new FakesDataGenerator(spec, outputPath)
      default:
        throw new Error(`Unknown generator type: ${type}`)
    }
  }
}

// Main generator orchestrator
class ApiGenerator {
  private config: GeneratorConfig
  private configManager: ConfigManager

  constructor() {
    this.configManager = new ConfigManager()
    this.config = this.configManager.getConfig()
  }

  private validateOptions(options: GeneratorOptions): string {
    const specPath = options.spec || this.config.spec?.default
    if (!specPath) {
      console.error("Error: No specification file provided")
      console.log("Please specify a path to your OpenAPI spec file with --spec")
      process.exit(1)
    }
    return specPath
  }

  private async setupGeneration(options: GeneratorOptions): Promise<{
    spec: OpenApiSpec
    outputPath: string
    fs: NodeFileSystem
  }> {
    const specPath = this.validateOptions(options)
    const outputPath = PathResolver.resolveOutputPath(options, this.config)
    const spec = await SpecLoader.load(specPath)
    const fs = new NodeFileSystem()

    console.log(`Output directory: ${outputPath}`)
    return { spec, outputPath, fs }
  }

  private logGenerationStep(step: number, title: string): void {
    console.log(`\n--- Step ${step}: ${title}... ---`)
  }
  private async generateSingleType(
    type: string,
    spec: OpenApiSpec,
    outputPath: string,
    fs: NodeFileSystem,
    options?: any
  ): Promise<number> {
    const generator = GeneratorFactory.createGenerator(type, spec, outputPath, options)
    
    // Initialize spec with proper dereferencing for complex schemas
    if (generator.initializeSpec) {
      await generator.initializeSpec();
    }
    
    // Special handling for hooks generator
    if (type === 'hooks' && generator instanceof HooksGenerator) {
      this.setupHooksGenerator(generator, outputPath, fs, options)
    }

    const generated = generator.generate()
    generator.saveFiles(fs)
    return generated.size
  }

  private setupHooksGenerator(
    hooksGenerator: HooksGenerator,
    outputPath: string,
    fs: NodeFileSystem,
    options?: any
  ): void {
    const servicesPath = fs.joinPath(outputPath, "services")
    try {
      hooksGenerator.loadServicesFromDirectory(servicesPath, fs)
    } catch (error) {
      console.log("No services found in output directory, generating from spec instead")
    }
  }

  private displayGenerationSummary(counts: GenerationCounts): void {
    console.log("\n=== API Contract Generation Summary ===")
    console.log(`Generated ${counts.types} TypeScript Types (for all entities)`)
    console.log(`Generated ${counts.schemas} Zod Schemas (for validation)`)
    console.log(`Generated ${counts.services} API Services`)
    console.log(`Generated ${counts.views} View Models (for GET responses only)`)
    console.log(`Generated ${counts.hooks} React Query Hooks`)
    console.log(`Generated ${counts.components.list} List Components (for GET responses)`)
    console.log(`Generated ${counts.components.createForm} Create Forms (for POST request bodies)`)
    console.log(`Generated ${counts.components.editForm} Edit Forms (for PUT/PATCH request bodies)`)
    console.log(`Generated ${counts.mocks} API Mocks`)
    console.log(`Generated ${counts.fakesData} Fake Data Generators`)
    console.log("\nGeneration completed successfully!")
  }

  async generateAll(options: GeneratorOptions): Promise<void> {
    const { spec, outputPath, fs } = await this.setupGeneration(options)
    
    console.log("\n=== Generating All API Contracts ===\n")

    const counts: GenerationCounts = {
      types: 0,
      schemas: 0,
      services: 0,
      views: 0,
      hooks: 0,
      components: { list: 0, createForm: 0, editForm: 0 },
      mocks: 0,
      fakesData: 0,
    }

    // Generate all types in sequence
    this.logGenerationStep(1, "Generating TypeScript Types")
    counts.types = await this.generateSingleType('types', spec, outputPath, fs)
    console.log(`✓ Generated ${counts.types} TypeScript types`)

    this.logGenerationStep(2, "Generating Zod Schemas")
    counts.schemas = await this.generateSingleType('schemas', spec, outputPath, fs)
    console.log(`✓ Generated ${counts.schemas} Zod schemas`)

    this.logGenerationStep(3, "Generating API Services")
    counts.services = await this.generateSingleType('services', spec, outputPath, fs)
    console.log(`✓ Generated ${counts.services} API services`)

    this.logGenerationStep(4, "Generating View Models")
    counts.views = await this.generateSingleType('views', spec, outputPath, fs)
    console.log(`✓ Generated ${counts.views} view models (for GET responses only)`)

    this.logGenerationStep(5, "Generating React Query Hooks")
    counts.hooks = await this.generateSingleType('hooks', spec, outputPath, fs, options)
    console.log(`✓ Generated ${counts.hooks} React Query hooks`)
    
    this.logGenerationStep(6, "Generating React Components")
    const componentOptions = {
      generateForms: options.forms !== undefined ? options.forms : true,
      generateLists: options.list !== undefined ? options.list : true,
    }
    
    const componentsGenerator = GeneratorFactory.createGenerator('components', spec, outputPath, componentOptions)
    
    // Initialize spec with proper dereferencing for complex schemas
    if (componentsGenerator.initializeSpec) {
      await componentsGenerator.initializeSpec();
    }
    
    const generatedComponents = componentsGenerator.generate()
    componentsGenerator.saveFiles(fs)

    const componentNames = Array.from(generatedComponents.keys())
    counts.components.list = componentNames.filter(name => name.endsWith("List")).length
    counts.components.createForm = componentNames.filter(name => name.endsWith("CreateForm")).length
    counts.components.editForm = componentNames.filter(name => name.endsWith("EditForm")).length

    console.log(`✓ Generated ${counts.components.list} list components (for GET responses)`)
    console.log(`✓ Generated ${counts.components.createForm} create forms (for POST request bodies)`)
    console.log(`✓ Generated ${counts.components.editForm} edit forms (for PUT/PATCH request bodies)`)

    this.logGenerationStep(7, "Generating API Mocks")
    counts.mocks = await this.generateSingleType('mocks', spec, outputPath, fs)
    console.log(`✓ Generated ${counts.mocks} API mocks`)

    this.logGenerationStep(8, "Generating Fake Data")
    counts.fakesData = await this.generateSingleType('fakesData', spec, outputPath, fs)
    console.log(`✓ Generated ${counts.fakesData} fake data generators`)

    this.displayGenerationSummary(counts)
    console.log(`Generation complete. Files saved to ${outputPath}`)
  }

  async generateSingle(type: string, options: GeneratorOptions): Promise<number> {
    const { spec, outputPath, fs } = await this.setupGeneration(options)
    
    console.log(`\nGenerating ${type} in: ${outputPath}`)

    let count = 0
    let displayName = type

    switch (type) {
      case 'types':
        count = await this.generateSingleType('types', spec, outputPath, fs)
        console.log(`✓ Generated ${count} TypeScript types`)
        break
      case 'schemas':
        count = await this.generateSingleType('schemas', spec, outputPath, fs)
        console.log(`✓ Generated ${count} Zod schemas`)
        break
      case 'services':
        count = await this.generateSingleType('services', spec, outputPath, fs)
        console.log(`✓ Generated ${count} API services`)
        break
      case 'views':
        count = await this.generateSingleType('views', spec, outputPath, fs)
        console.log(`✓ Generated ${count} view models (for GET responses only)`)
        break
      case 'hooks':
        count = await this.generateSingleType('hooks', spec, outputPath, fs, options)
        console.log(`✓ Generated ${count} React Query hooks`)
        break
      case 'components':
        count = await this.generateComponents(spec, outputPath, fs, options)
        break
      case 'mocks':
        count = await this.generateSingleType('mocks', spec, outputPath, fs)
        console.log(`✓ Generated ${count} API mock services`)
        break
      case 'fakesData':
        count = await this.generateSingleType('fakesData', spec, outputPath, fs)
        console.log(`✓ Generated ${count} fake data generators`)
        break
      default:
        throw new Error(`Unknown generation type: ${type}`)
    }

    FileDisplayer.displayGeneratedFiles(fs, outputPath, displayName)
    return count
  }

  private async generateComponents(
    spec: OpenApiSpec,
    outputPath: string,
    fs: NodeFileSystem,
    options: GeneratorOptions
  ): Promise<number> {
    const generateForms = options.forms !== undefined ? options.forms : true
    const generateLists = options.list !== undefined ? options.list : true

    const componentsGenerator = new ComponentsGenerator(spec, outputPath, {
      generateForms,
      generateLists,
    })

    // Initialize spec with proper dereferencing for complex schemas
    await componentsGenerator.initializeSpec();

    console.log("Generating React Components...")
    const generated = componentsGenerator.generate()

    const listCount = Array.from(generated.keys()).filter(name => name.endsWith("List")).length
    const createFormCount = Array.from(generated.keys()).filter(name => name.endsWith("CreateForm")).length
    const editFormCount = Array.from(generated.keys()).filter(name => name.endsWith("EditForm")).length

    componentsGenerator.saveFiles(fs)

    console.log(`✓ Generated ${listCount} list components (for GET responses)`)
    console.log(`✓ Generated ${createFormCount} create forms (for POST request bodies)`)
    console.log(`✓ Generated ${editFormCount} edit forms (for PUT/PATCH request bodies)`)

    return generated.size
  }
}

// CLI Setup
class CLISetup {
  private apiGenerator: ApiGenerator
  private program: Command

  constructor() {
    this.apiGenerator = new ApiGenerator()
    this.program = new Command()
    this.setupCommands()
  }

  private setupCommands(): void {
    const config = this.apiGenerator['config']

    this.program
      .name("generate-api")
      .description("API Contract Generator for OpenAPI specifications")
      .version("0.0.1")

    // All command
    this.program
      .command("all")
      .description("Generate all API contracts (types, schemas, services, hooks, components)")
      .option("-s, --spec <path>", "Path to the OpenAPI specification file (YAML or JSON)", config.spec?.default)
      .option("-o, --outDir <directory>", "Output directory for generated files", config.output?.default)
      .option("--hooks [path]", "Generate React hooks for API services (specify output path or use default)")
      .option("--components [path]", "Generate React components (forms and lists) (specify output path or use default)")
      .action(async (options) => {
        await this.apiGenerator.generateAll(options)
      })

    // Individual generators
    const generators = [
      { name: 'types', description: 'Generate TypeScript types from OpenAPI schemas' },
      { name: 'schemas', description: 'Generate Zod schemas from OpenAPI schemas' },
      { name: 'services', description: 'Generate API service classes from OpenAPI paths' },
      { name: 'views', description: 'Generate view helper classes from OpenAPI schemas' },
      { name: 'mocks', description: 'Generate API mock services from OpenAPI paths' },
      { name: 'fakes-data', description: 'Generate fake data generators from OpenAPI schemas' }
    ]

    generators.forEach(gen => {
      this.program
        .command(gen.name)
        .description(gen.description)
        .option("-s, --spec <path>", "Path to the OpenAPI specification file (YAML or JSON)", config.spec?.default)
        .option("-o, --outDir <directory>", "Output directory for generated files", config.output?.default)
        .action(async (options) => {
          const type = gen.name === 'fakes-data' ? 'fakesData' : gen.name
          await this.apiGenerator.generateSingle(type, options)
        })
    })

    // Special commands with additional options
    this.setupHooksCommand(config)
    this.setupComponentsCommand(config)
  }

  private setupHooksCommand(config: GeneratorConfig): void {
    this.program
      .command("hooks")
      .description("Generate React Query hooks from API services")
      .option("-s, --spec <path>", "Path to the OpenAPI specification file", config.spec?.default)
      .option("-o, --outDir <directory>", "Output directory for generated hooks", config.output?.default)
      .option("-i, --input <directory>", "Input directory containing service files (optional)", 
        config.options?.hooksGeneration?.servicesInputPath || undefined)
      .action(async (options) => {
        await this.apiGenerator.generateSingle('hooks', options)
      })
  }

  private setupComponentsCommand(config: GeneratorConfig): void {
    this.program
      .command("components")
      .description("Generate React components (forms and lists) from OpenAPI schemas")
      .option("-s, --spec <path>", "Path to the OpenAPI specification file (YAML or JSON)", config.spec?.default)
      .option("-o, --outDir <directory>", "Output directory for generated components", config.output?.default)
      .option("--forms", "Generate form components", config.options?.componentsGeneration?.generateForms)
      .option("--list", "Generate list components", config.options?.componentsGeneration?.generateLists)      .action(async (options) => {
        try {
          await this.apiGenerator.generateSingle('components', options)
        } catch (error) {
          console.log(error)
        }
      })
  }

  run(): void {
    this.program.parse(process.argv)

    // If no command provided, show help
    if (process.argv.length <= 2) {
      this.program.help()
    }
  }
}

// Main execution
const cli = new CLISetup()
cli.run()