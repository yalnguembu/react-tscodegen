import { BaseGenerator } from '../BaseGenerator.js';
import { FileSystemAPI } from '../FileSystem.js';
import { SchemaDefinition, SchemaReference } from '../types.js';

export class SchemasGenerator extends BaseGenerator {
  private _generatedSchemas: Map<string, string> = new Map();
  
  protected getGeneratorKey(): string {
    return 'schemas';
  }

  protected performGeneration(): Map<string, string> {
    return this.generate();
  }

  protected async generateFiles(fs: FileSystemAPI): Promise<void> {
    this.saveFiles(fs);
  }
    generate(): Map<string, string> {
    // Process paths to identify schemas used in request bodies
    const requestBodySchemas = new Set<string>();

    // Scan all paths to identify schemas used in request bodies
    Object.entries(this.spec.paths || {}).forEach(([path, methods]) => {
      Object.entries(methods || {}).forEach(([method, endpoint]) => {
        // Process request bodies for all methods
        if (endpoint.requestBody?.content?.['application/json']?.schema) {
          const schema = endpoint.requestBody.content['application/json'].schema;
          if ('$ref' in schema) {
            const schemaName = this.extractNameFromRef(schema.$ref);
            requestBodySchemas.add(schemaName);
          }
        }
      });
    });

    // Always generate schemas for all types for validation purposes
    Object.entries(this.spec.components.schemas).forEach(([name, schema]) => {
      const zodSchema = this.generateZodSchema(name, schema as SchemaDefinition);
      this._generatedSchemas.set(name, zodSchema);
    });
    
    return this._generatedSchemas;
  }
  
  saveFiles(fs: FileSystemAPI): void {
    const schemasDir = this.getOutputDirectory('schemas');
    fs.ensureDirectoryExists(schemasDir);
    
    let indexFileContent = '// Auto-generated schemas from API spec\nimport { z } from \'zod\';\n\n';
    
    this._generatedSchemas.forEach((content, name) => {
      const fileName = `${this.toKebabCase(name)}.schema.ts`;
      const filePath = fs.joinPath(schemasDir, fileName);
      
      const contentWithImport = 'import { z } from \'zod\';\nimport { ' + name + ' } from \'../types\';\n\n' + content;
      fs.writeFile(filePath, contentWithImport);
      
      indexFileContent += `export * from './${this.toKebabCase(name)}.schema';\n`;
    });
    
    this.createIndexFile(schemasDir, indexFileContent, fs);
  }
  
  private generateZodSchema(name: string, schema: SchemaDefinition): string {
    const zodSchema = this.getZodFromSchema(schema);
    return `export const ${name}Schema = ${zodSchema};\n`;
  }
  
  private getZodFromSchema(schema: any): string {
    if (schema.$ref) {
      const refName = this.extractNameFromRef(schema.$ref);
      return `${refName}Schema`;
    }
    
    switch (schema.type) {
      case 'object': {
        const properties = schema.properties || {};
        const required = schema.required || [];
        
        const propSchemas = Object.entries(properties).map(([key, val]) => {
          const zodValue = this.getZodFromSchema(val);
          return `    ${key}: ${required.includes(key) ? zodValue : `${zodValue}.optional()`}`;
        }).join(',\n');
        
        return `z.object({\n${propSchemas}\n  })`;
      }
      case 'array':
        return `z.array(${this.getZodFromSchema(schema.items)})`;
      case 'string':
        if (schema.enum) {
          return `z.enum([${schema.enum.map((e: string) => `'${e}'`).join(', ')}])`;
        }
        if (schema.format === 'email') {
          return 'z.string().email()';
        }
        return 'z.string()';
      case 'number':
      case 'integer':
        return 'z.number()';
      case 'boolean':
        return 'z.boolean()';
      default:
        return 'z.any()';
    }
  }
}
