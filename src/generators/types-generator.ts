import { BaseGenerator } from '../base-generator.js';
import { FileSystemAPI } from '../file-system.js';
import { SchemaDefinition } from '../types.js';

export class TypesGenerator extends BaseGenerator {
  private _generatedTypes: Map<string, string> = new Map();
  
  generate(): Map<string, string> {
    Object.entries(this.spec.components.schemas).forEach(([name, schema]) => {
      const typeDefinition = this.generateTypeDefinition(name, schema);
      this._generatedTypes.set(name, typeDefinition);
    });
    
    return this._generatedTypes;
  }
  
  saveFiles(fs: FileSystemAPI): void {
    const typesDir = this.getOutputDirectory('types');
    fs.ensureDirectoryExists(typesDir);
    
    let indexFileContent = '// Auto-generated type definitions from API spec\n\n';
    
    this._generatedTypes.forEach((content, name) => {
      const fileName = `${this.toKebabCase(name)}.ts`;
      const filePath = fs.joinPath(typesDir, fileName);
      fs.writeFile(filePath, content);
      
      indexFileContent += `export * from './${this.toKebabCase(name)}';\n`;
    });
    
    this.createIndexFile(typesDir, indexFileContent, fs);
  }
  
  private generateTypeDefinition(name: string, schema: SchemaDefinition): string {
    switch (schema.type) {
      case 'object':
        return this.generateObjectTypeDefinition(name, schema);
      case 'array':
        return this.generateArrayTypeDefinition(name, schema);
      default:
        return this.generatePrimitiveTypeDefinition(schema);
    }
  }
  
  private generateObjectTypeDefinition(name: string, schema: SchemaDefinition): string {
    const properties = schema.properties || {};
    const required = schema.required || [];
    
    const propertyDefinitions = Object.entries(properties).map(([propName, propSchema]) => {
      const isRequired = required.includes(propName);
      const type = this.getTypeFromSchema(propSchema);
      return `  ${propName}${isRequired ? '' : '?'}: ${type};`;
    }).join('\n');
    
    return `export interface ${name} {\n${propertyDefinitions}\n}\n`;
  }
  
  private generateArrayTypeDefinition(name: string, schema: SchemaDefinition): string {
    const itemType = schema.items ? this.getTypeFromSchema(schema.items) : 'any';
    
    return `export type ${name} = ${itemType}[];\n`;
  }
  
  private generatePrimitiveTypeDefinition(schema: SchemaDefinition): string {
    return this.getTypeFromSchema(schema);
  }
  
  private getTypeFromSchema(schema: any): string {
    if (schema.$ref) {
      return this.extractNameFromRef(schema.$ref);
    }
    
    switch (schema.type) {
      case 'string':
        if (schema.enum) {
          return schema.enum.map((e: string) => `'${e}'`).join(' | ');
        }
        return 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        const itemType = schema.items ? this.getTypeFromSchema(schema.items) : 'any';
        return `${itemType}[]`;
      case 'object':
        if (schema.properties) {
          const propTypes = Object.entries(schema.properties).map(([key, val]) => 
            `${key}: ${this.getTypeFromSchema(val)}`
          ).join(', ');
          return `{ ${propTypes} }`;
        }
        return 'Record<string, any>';
      default:
        return 'any';
    }
  }
}
