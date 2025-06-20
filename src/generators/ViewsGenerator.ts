import { BaseGenerator } from '../BaseGenerator.js';
import { FileSystemAPI } from '../FileSystem.js';
import { SchemaDefinition, SchemaReference } from '../types.js';
import { TemplateEngine, TemplateVariables } from '../core/TemplateEngine.js';
import { 
  VIEW_CLASS_TEMPLATE, 
  VIEW_IMPORTS_TEMPLATE, 
  VIEW_GETTER_METHOD_TEMPLATE, 
  VIEW_INDEX_TEMPLATE 
} from '../templates/view.template.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the equivalent of __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ViewsGenerator extends BaseGenerator {
  private _generatedViews: Map<string, string> = new Map();
  
  protected getGeneratorKey(): string {
    return 'views';
  }

  protected performGeneration(): Map<string, string> {
    return this.generate();
  }

  protected async generateFiles(fs: FileSystemAPI): Promise<void> {
    this.saveFiles(fs);
  }
  generate(): Map<string, string> {
    // Process paths to identify schemas used in GET responses
    const getResponseSchemas = new Set<string>();
    const allRelevantSchemas = new Set<string>();

    // Scan all paths to identify schemas used in GET responses
    Object.entries(this.spec.paths || {}).forEach(([path, methods]) => {
      Object.entries(methods || {}).forEach(([method, endpoint]) => {
        if (method.toUpperCase() === 'GET') {
          // Process GET responses
          const successResponse = endpoint.responses?.['200'] || endpoint.responses?.['201'];
          if (successResponse?.content?.['application/json']?.schema) {
            const schema = successResponse.content['application/json'].schema;            if ('$ref' in schema) {
              const schemaName = this.extractNameFromRef(schema.$ref);
              getResponseSchemas.add(schemaName);
              allRelevantSchemas.add(schemaName);
            }
          }
        }
      });
    });

    // Also include schemas that are main entity types (not input/view/paginated types)
    Object.entries(this.spec.components.schemas).forEach(([name, schema]) => {
      if ((schema as SchemaDefinition).type === 'object' && 
          !name.endsWith('View') && 
          !name.endsWith('Input') &&
          !name.startsWith('Paginated') &&
          !name.includes('Error') &&
          !name.includes('Requirement') &&
          !name.includes('Pagination')) {
        allRelevantSchemas.add(name);
      }
    });

    // Generate views for all relevant schemas
    Object.entries(this.spec.components.schemas).forEach(([name, schema]) => {
      if ((schema as SchemaDefinition).type === 'object' && 
          !name.endsWith('View') && 
          !name.includes('Error') &&
          allRelevantSchemas.has(name)) {
        const viewCode = this.generateViewClass(name, schema as SchemaDefinition);
        this._generatedViews.set(`${name}View`, viewCode);
      }
    });
    
    return this._generatedViews;
  }
    saveFiles(fs: FileSystemAPI): void {
    const viewsDir = this.getOutputDirectory('views');
    fs.ensureDirectoryExists(viewsDir);
    
    const exportStatements: string[] = [];
    
    this._generatedViews.forEach((content, name) => {
      const fileName = `${this.toKebabCase(name)}.ts`;
      const filePath = fs.joinPath(viewsDir, fileName);
      
      const baseName = name.replace('View', '');
      const imports = TemplateEngine.process(VIEW_IMPORTS_TEMPLATE, {
        entityName: baseName
      });
      
      const fullContent = `${imports}\n\n${content}`;
      fs.writeFile(filePath, fullContent);
      
      exportStatements.push(`export * from './${this.toKebabCase(name)}';`);
    });
    
    const indexContent = TemplateEngine.process(VIEW_INDEX_TEMPLATE, {
      exportStatements: exportStatements.join('\n')
    });
    
    this.createIndexFile(viewsDir, indexContent, fs);
  }  private generateViewClass(name: string, schema: SchemaDefinition): string {
    // Generate template variables for data handling class only
    const variables: TemplateVariables = {
      entityName: name,
      zodSchema: this.generateZodSchemaForView(name, schema),
      getterMethods: this.generateGetterMethods(schema),
      imports: '' // Will be handled separately in saveFiles
    };
    
    // Apply transformations for naming conventions
    const transformedVariables = TemplateEngine.applyTransformations(variables);
    
    // Process the template
    return TemplateEngine.process(VIEW_CLASS_TEMPLATE, transformedVariables);
  }

  private generateZodSchemaForView(name: string, schema: SchemaDefinition): string {
    const zodProps: string[] = [];
    
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
        const zodType = this.getZodType(propSchema);
        const isRequired = schema.required?.includes(propName) ?? false;
        
        let zodProp = `  ${propName}: ${zodType}`;
        if (!isRequired) {
          zodProp += '.optional()';
        }
        
        zodProps.push(zodProp);
      });
    }
    
    return `export const ${name}Schema = z.object({
${zodProps.join(',\n')}
});

export type ${name} = z.infer<typeof ${name}Schema>;`;
  }

  private getZodType(propSchema: any): string {
    if ('$ref' in propSchema) {
      // For referenced schemas, use z.any() or create a basic object schema
      return 'z.object({}).passthrough()';
    }
    
    if (propSchema.type === 'array') {
      const itemType = propSchema.items ? this.getZodType(propSchema.items) : 'z.any()';
      return `z.array(${itemType})`;
    }
    
    switch (propSchema.type) {
      case 'string':
        if (propSchema.format === 'email') return 'z.string().email()';
        if (propSchema.format === 'date-time') return 'z.string().datetime()';
        if (propSchema.format === 'date') return 'z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/)';
        if (propSchema.enum) return `z.enum([${propSchema.enum.map((e: string) => `'${e}'`).join(', ')}])`;
        return 'z.string()';
      case 'number':
        return 'z.number()';
      case 'integer':
        return 'z.number().int()';
      case 'boolean':
        return 'z.boolean()';
      case 'object':
        return 'z.object({}).passthrough()';
      default:
        return 'z.any()';
    }
  }

  private generateViewTemplate(name: string, schema: SchemaDefinition): string {
    let template = '';
    
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
        const displayName = this.toDisplayName(propName);
        template += `        <div className="${name.toLowerCase()}-field ${propName}">
          <label className="field-label">${displayName}:</label>
          <span className="field-value">
            {viewInstance.get${this.toPascalCase(propName)}()}
          </span>
        </div>\n`;
      });
    }
    
    return template;
  }

  private generateSafeGetter(propName: string, propType: string): string {
    const methodName = `get${this.toPascalCase(propName)}`;
    const fallback = this.getTypeFallback(propType);
    
    return `
  ${methodName}(): ${propType} {
    return this.data.${propName} ?? ${fallback};
  }`;
  }

  private getTypeFallback(propType: string): string {
    if (propType.includes('string')) return "''";
    if (propType.includes('number')) return '0';
    if (propType.includes('boolean')) return 'false';
    if (propType.includes('[]')) return '[]';
    return '{}';
  }

  private toDisplayName(propName: string): string {
    return propName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  private getPropertyType(propSchema: any): string {
    if ('$ref' in propSchema) {
      const refType = this.extractNameFromRef(propSchema.$ref);
      return refType;
    }
    
    if (propSchema.type === 'array') {
      const itemType = propSchema.items ? this.getPropertyType(propSchema.items) : 'any';
      return `${itemType}[]`;
    }
    
    switch (propSchema.type) {
      case 'string':
        return 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'object':
        return 'any';
      default:
        return 'any';
    }
  }

  private generateGetterMethods(schema: SchemaDefinition): string {
    if (!schema.properties) {
      return '';
    }
    
    const getterMethods: string[] = [];
    
    Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
      const propType = this.getPropertyType(propSchema);
      const capitalizedPropName = this.toPascalCase(propName);
      const defaultValue = this.getTypeFallback(propType);
      
      const getterMethod = TemplateEngine.process(VIEW_GETTER_METHOD_TEMPLATE, {
        capitalizedPropName,
        propType,
        propName,
        defaultValue
      });
      
      getterMethods.push(getterMethod);
    });
    
    return getterMethods.join('');
  }
}
