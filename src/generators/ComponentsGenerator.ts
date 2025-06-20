import { BaseGenerator } from '../BaseGenerator.js';
import { FileSystemAPI } from '../FileSystem.js';
import { SchemaDefinition, SchemaReference } from '../types.js';
import { TemplateEngine, TemplateVariables } from '../core/TemplateEngine.js';
import { 
  CARD_COMPONENT_TEMPLATE, 
  CARD_IMPORTS_TEMPLATE, 
  CARD_FIELD_TEMPLATE,
  CARD_INDEX_TEMPLATE 
} from '../templates/card.template.js';
import { 
  LIST_COMPONENT_TEMPLATE, 
  LIST_IMPORTS_TEMPLATE,
  LIST_INDEX_TEMPLATE 
} from '../templates/list.template.js';
import { CREATE_FORM_TEMPLATE, EDIT_FORM_TEMPLATE, FORM_FIELD_TEMPLATE } from '../templates/form.template.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the equivalent of __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ComponentsGenerator extends BaseGenerator {
  private _generatedComponents: Map<string, string> = new Map();
  private _generateForms: boolean;
  private _generateLists: boolean;
  private _generateCards: boolean;
  
  constructor(
    spec: any, 
    outputPath: string, 
    options: { generateForms?: boolean, generateLists?: boolean, generateCards?: boolean } = {}
  ) {
    super(spec, outputPath);
    this._generateForms = options.generateForms !== false; // Default to true if not specified
    this._generateLists = options.generateLists !== false; // Default to true if not specified
    this._generateCards = options.generateCards !== false; // Default to true if not specified
  }

  protected getGeneratorKey(): string {
    return 'components';
  }

  protected performGeneration(): Map<string, string> {
    return this.generate();
  }

  protected async generateFiles(fs: FileSystemAPI): Promise<void> {
    this.saveFiles(fs);
  }  generate(): Map<string, string> {
    console.log("Scanning OpenAPI paths for components generation...");

    // Collect all GET method responses for list generation
    const getAllGetResponseSchemas = (): Set<string> => {
      const schemas = new Set<string>();
      Object.entries(this.spec.paths || {}).forEach(([path, methods]) => {
        Object.entries(methods || {}).forEach(([method, endpoint]) => {
          if (method.toUpperCase() === 'GET') {
            const successResponse = endpoint.responses?.['200'] || endpoint.responses?.['201'];
            if (successResponse?.content?.['application/json']?.schema) {
              const schema = successResponse.content['application/json'].schema;
              
              // Handle direct schema references
              if ('$ref' in schema) {
                const schemaName = this.extractNameFromRef(schema.$ref);
                schemas.add(schemaName);
                console.log(`Found GET response schema: ${schemaName} for path ${path}`);
              }              // Handle arrays of items (e.g., array responses)
              else if (schema.type === 'array' && schema.items && '$ref' in schema.items) {
                const schemaName = this.extractNameFromRef((schema.items as SchemaReference).$ref);
                schemas.add(schemaName);
                console.log(`Found GET array response schema: ${schemaName} for path ${path}`);
              }
              // Handle inline schemas with properties
              else if (schema.properties && schema.properties.items && '$ref' in schema.properties.items) {
                const schemaName = this.extractNameFromRef((schema.properties.items as SchemaReference).$ref);
                schemas.add(schemaName);
                console.log(`Found GET nested response schema: ${schemaName} for path ${path}`);
              }
            }
          }
        });
      });
      return schemas;
    };

    // Get all relevant schemas for generation
    const getResponseSchemas = getAllGetResponseSchemas();
    const postRequestSchemas = new Set<string>();
    const putPatchRequestSchemas = new Set<string>();
    const entitySchemas = new Set<string>();

    // Collect POST and PUT/PATCH schemas for forms
    Object.entries(this.spec.paths || {}).forEach(([path, methods]) => {
      Object.entries(methods || {}).forEach(([method, endpoint]) => {
        if (method.toUpperCase() === 'POST' && endpoint.requestBody?.content?.['application/json']?.schema) {
          const schema = endpoint.requestBody.content['application/json'].schema;
          if ('$ref' in schema) {
            const schemaName = this.extractNameFromRef(schema.$ref);
            postRequestSchemas.add(schemaName);
          }
        } else if (['PUT', 'PATCH'].includes(method.toUpperCase()) && endpoint.requestBody?.content?.['application/json']?.schema) {
          const schema = endpoint.requestBody.content['application/json'].schema;
          if ('$ref' in schema) {
            const schemaName = this.extractNameFromRef(schema.$ref);
            putPatchRequestSchemas.add(schemaName);
          }
        }
      });
    });

    // Collect entity schemas for card generation
    Object.entries(this.spec.components.schemas || {}).forEach(([name, schema]) => {
      if (this.isObjectSchema(schema) && 
          !name.endsWith('View') && 
          !name.endsWith('Error') &&
          !name.endsWith('Input') &&
          !name.endsWith('Response') &&
          !name.includes('Paginated')) {
        entitySchemas.add(name);
      }
    });

    console.log(`Found ${getResponseSchemas.size} GET response schemas for lists`);
    console.log(`Found ${postRequestSchemas.size} POST request schemas for create forms`);
    console.log(`Found ${putPatchRequestSchemas.size} PUT/PATCH request schemas for edit forms`);
    console.log(`Found ${entitySchemas.size} entity schemas for cards`);

    // Generate components
    Object.entries(this.spec.components.schemas || {}).forEach(([name, schema]) => {
      if (this.isObjectSchema(schema)) {
        // Generate card components for all entity schemas
        if (this._generateCards && entitySchemas.has(name)) {
          console.log(`Generating card component for ${name}`);
          const cardCode = this.generateCardComponent(name, schema as SchemaDefinition);
          this._generatedComponents.set(`${name}Card`, cardCode);
        }

        // Generate list components for ALL GET response schemas
        if (this._generateLists && getResponseSchemas.has(name)) {
          console.log(`Generating list component for ${name}`);
          const listCode = this.generateListComponent(name, schema as SchemaDefinition);
          this._generatedComponents.set(`${name}List`, listCode);
        }
        
        // Generate form components if enabled
        if (this._generateForms) {
          if (postRequestSchemas.has(name)) {
            console.log(`Generating create form for ${name}`);
            const createFormCode = this.generateCreateFormComponent(name, schema as SchemaDefinition);
            this._generatedComponents.set(`${name}CreateForm`, createFormCode);
          }
          
          if (putPatchRequestSchemas.has(name)) {
            console.log(`Generating edit form for ${name}`);
            const editFormCode = this.generateEditFormComponent(name, schema as SchemaDefinition);
            this._generatedComponents.set(`${name}EditForm`, editFormCode);
          }
        }
      }
    });
    
    return this._generatedComponents;
  }
  saveFiles(fs: FileSystemAPI): void {
    const componentsBasePath = this.getOutputDirectory('components');    
    // Create directories for different types of components
    const formsDir = fs.joinPath(componentsBasePath, 'forms');
    const createFormsDir = fs.joinPath(formsDir, 'create');
    const editFormsDir = fs.joinPath(formsDir, 'edit');
    const listsDir = fs.joinPath(componentsBasePath, 'lists');
    const cardsDir = fs.joinPath(componentsBasePath, 'cards');
    
    fs.ensureDirectoryExists(createFormsDir);
    fs.ensureDirectoryExists(editFormsDir);
    fs.ensureDirectoryExists(listsDir);
    fs.ensureDirectoryExists(cardsDir);
    
    let createFormsIndexContent = '// Auto-generated create form components from API spec\n\n';
    let editFormsIndexContent = '// Auto-generated edit form components from API spec\n\n';
    let listsIndexContent = '// Auto-generated list components from API spec\n\n';
    let cardsIndexContent = '// Auto-generated card components from API spec\n\n';
    
    const generatedFiles = {
      lists: [] as string[],
      createForms: [] as string[],
      editForms: [] as string[],
      cards: [] as string[]
    };
    
    // Save each component to the appropriate directory
    this._generatedComponents.forEach((content, name) => {
      if (name.endsWith('List')) {
        // Save list component (for GET responses)
        const fileName = `${this.toKebabCase(name)}.tsx`;
        const filePath = fs.joinPath(listsDir, fileName);
        fs.writeFile(filePath, content);
        
        listsIndexContent += `export * from './${this.toKebabCase(name)}';\n`;
        generatedFiles.lists.push(filePath);
      } else if (name.endsWith('Card')) {
        // Save card component (for entities)
        const fileName = `${this.toKebabCase(name)}.tsx`;
        const filePath = fs.joinPath(cardsDir, fileName);
        fs.writeFile(filePath, content);
        
        cardsIndexContent += `export * from './${this.toKebabCase(name)}';\n`;
        generatedFiles.cards.push(filePath);
      } else if (name.endsWith('CreateForm')) {
        // Save create form component (for POST request bodies)
        const fileName = `${this.toKebabCase(name)}.tsx`;
        const filePath = fs.joinPath(createFormsDir, fileName);
        fs.writeFile(filePath, content);
        
        createFormsIndexContent += `export * from './${this.toKebabCase(name)}';\n`;
        generatedFiles.createForms.push(filePath);
      } else if (name.endsWith('EditForm')) {
        // Save edit form component (for PUT/PATCH request bodies)
        const fileName = `${this.toKebabCase(name)}.tsx`;
        const filePath = fs.joinPath(editFormsDir, fileName);
        fs.writeFile(filePath, content);
        
        editFormsIndexContent += `export * from './${this.toKebabCase(name)}';\n`;
        generatedFiles.editForms.push(filePath);
      }
    });
    
    // Write index files
    fs.writeFile(fs.joinPath(createFormsDir, 'index.ts'), createFormsIndexContent);
    fs.writeFile(fs.joinPath(editFormsDir, 'index.ts'), editFormsIndexContent);
    fs.writeFile(fs.joinPath(listsDir, 'index.ts'), listsIndexContent);
    fs.writeFile(fs.joinPath(cardsDir, 'index.ts'), cardsIndexContent);
    
    // Create a main forms index
    const formsIndexContent = `// Auto-generated form components from API spec\n\nexport * from './create';\nexport * from './edit';\n`;
    fs.writeFile(fs.joinPath(formsDir, 'index.ts'), formsIndexContent);
    
    // Create a main components index
    const mainIndexContent = `// Auto-generated components from API spec\n\nexport * from './forms';\nexport * from './lists';\nexport * from './cards';\n`;
    fs.writeFile(fs.joinPath(componentsBasePath, 'index.ts'), mainIndexContent);
    
    // Log summary of generated files
    console.log(`Generated Components:
- ${generatedFiles.cards.length} Card Components (for entities)
- ${generatedFiles.lists.length} List Components (for GET responses)
- ${generatedFiles.createForms.length} Create Forms (for POST request bodies)
- ${generatedFiles.editForms.length} Edit Forms (for PUT/PATCH request bodies)`);
  }private generateCreateFormComponent(name: string, schema: SchemaDefinition): string {
    const properties = schema.properties || {};
    const required = schema.required || [];
    
    // Generate form fields
    const formFields = Object.entries(properties).map(([propName, propSchema]) => {
      const isRequired = required.includes(propName);
      return this.generateFormField(propName, propSchema, isRequired);
    }).join('\n      ');
    
    // Generate default values for form fields
    const defaultValues = Object.entries(properties)
      .map(([propName]) => `${propName}: undefined,`)
      .join('\n      ');
    
    // Generate the human-readable name for display
    const humanizedName = this.formatPropertyName(name);
    
    // Apply template replacements
    return CREATE_FORM_TEMPLATE
      .replace(/{{typeName}}/g, name)
      .replace(/{{schemaName}}/g, `${name}Schema`)
      .replace(/{{schemaFile}}/g, this.toKebabCase(name))
      .replace(/{{defaultValues}}/g, defaultValues)
      .replace(/{{formFields}}/g, formFields)
      .replace(/{{humanizedName}}/g, humanizedName);
  }  private generateEditFormComponent(name: string, schema: SchemaDefinition): string {
    const properties = schema.properties || {};
    const required = schema.required || [];
    
    // Generate form fields
    const formFields = Object.entries(properties).map(([propName, propSchema]) => {
      const isRequired = required.includes(propName);
      return this.generateFormField(propName, propSchema, isRequired);
    }).join('\n      ');
    
    // Generate the human-readable name for display
    const humanizedName = this.formatPropertyName(name);
    
    // Apply template replacements
    return EDIT_FORM_TEMPLATE
      .replace(/{{typeName}}/g, name)
      .replace(/{{schemaName}}/g, `${name}Schema`)
      .replace(/{{schemaFile}}/g, this.toKebabCase(name))
      .replace(/{{formFields}}/g, formFields)
      .replace(/{{humanizedName}}/g, humanizedName);
  }  private generateCardComponent(name: string, schema: SchemaDefinition): string {
    const properties = schema.properties || {};
    
    // Generate display fields for the card
    const cardFields = Object.entries(properties).slice(0, 6).map(([propName, propSchema]) => {
      const fieldType = this.getPropertyType(propSchema);
      return TemplateEngine.process(CARD_FIELD_TEMPLATE, {
        fieldLabel: this.formatPropertyName(propName),
        propName,
        capitalizedPropName: this.formatPropertyName(propName).replace(/\s/g, ''),
        propType: fieldType
      });
    }).join('\n');
    
    // Apply template replacements using TemplateEngine
    return TemplateEngine.process(CARD_COMPONENT_TEMPLATE, {
      imports: TemplateEngine.process(CARD_IMPORTS_TEMPLATE, { entityName: name }),
      entityName: name,
      entityNameLower: name.toLowerCase(),
      cardTitle: this.formatPropertyName(name),
      cardFields,
      humanizedName: this.formatPropertyName(name)
    });
  }  private generateListComponent(name: string, schema: SchemaDefinition): string {
    const properties = schema.properties || {};
    
    // Pick properties to display in the list (first 5 properties)
    const displayProps = Object.keys(properties).slice(0, 5);
    const keyField = Object.keys(properties).find(key => key.toLowerCase().includes('id')) || 'id';
    
    // Create variables for the template
    const variables: TemplateVariables = {
      imports: TemplateEngine.process(LIST_IMPORTS_TEMPLATE, { 
        itemType: name,
        cardComponentName: `${name}Card`,
        cardComponentFile: `../cards/${this.toKebabCase(name)}-card`
      }),
      entityName: name,
      entityNameLower: name.toLowerCase(),
      itemType: name,
      cardComponentName: `${name}Card`,
      cardComponentFile: `../cards/${this.toKebabCase(name)}-card`,
      keyField: `item.${keyField}`,
      listTitle: `${this.formatPropertyName(name)} List`,
      displayProperties: displayProps,
      humanizedName: this.formatPropertyName(name)
    };
    
    // Apply template replacements using TemplateEngine
    return TemplateEngine.process(LIST_COMPONENT_TEMPLATE, variables);
  }
    private generateFormField(propName: string, propSchema: any, isRequired: boolean): string {
    const label = this.formatPropertyName(propName);
    
    // Use the form field template from the imported template
    let fieldContent = FORM_FIELD_TEMPLATE
      .replace(/{{name}}/g, propName)
      .replace(/{{label}}/g, label)
      .replace(/{{required}}/g, isRequired ? 'true' : 'false');
    
    if (propSchema.$ref) {
      // It's a reference to another schema - would need a select field
      return this.generateSelectField(propName, label, isRequired, `Referenced type: ${this.extractNameFromRef(propSchema.$ref)}`);
    }
    
    switch (propSchema.type || 'string') { // Default to string if type is undefined
      case 'string':
        if (propSchema.enum) {
          // Enum type field
          const options = propSchema.enum.map((value: string) => 
            `<option value="${value}">${value}</option>`
          ).join('\n          ');
          return this.generateSelectField(propName, label, isRequired, options);
        } else if (propSchema.format === 'date-time' || propSchema.format === 'date') {
          // Date input
          return fieldContent.replace(/{{type}}/g, 'date');
        } else if (propSchema.format === 'email') {
          // Email input
          return fieldContent.replace(/{{type}}/g, 'email');
        } else {
          // Regular text input
          return fieldContent.replace(/{{type}}/g, 'text');
        }
      
      case 'integer':
      case 'number':
        return fieldContent.replace(/{{type}}/g, 'number');
        
      case 'boolean':
        return fieldContent.replace(/{{type}}/g, 'checkbox');
        
      case 'array':
      case 'object':
      default:
        return fieldContent.replace(/{{type}}/g, 'text');
    }
  }
  
  private generateSelectField(propName: string, label: string, isRequired: boolean, options: string): string {
    // Simplified template for select fields
    return `<FormField
      control={form.control}
      name="${propName}"
      render={({ field }) => (
        <FormItem>
          <FormLabel>${label}${isRequired ? ' *' : ''}</FormLabel>
          <select 
            {...field}
            className="w-full p-2 border rounded"
          >
            <option value="">Select ${label}</option>
            ${options}
          </select>
          <FormMessage />
        </FormItem>
      )}
    />`;
  }
    private getPropertyType(propSchema: any): string {
    if (propSchema.$ref) {
      return this.extractNameFromRef(propSchema.$ref);
    }
    
    switch (propSchema.type) {
      case 'string':
        return 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        return 'any[]';
      case 'object':
        return 'object';
      default:
        return 'any';
    }
  }

  private formatPropertyName(name: string): string {
    return name
      // Insert a space before all capital letters
      .replace(/([A-Z])/g, ' $1')
      // Capitalize the first letter
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }
  
  private isObjectSchema(schema: SchemaDefinition): boolean {
    // A schema is considered an object if:
    // 1. It explicitly has type: 'object', OR
    // 2. It has properties (implied object type), OR  
    // 3. It uses allOf composition pattern, OR
    // 4. It has no type specified but has properties (common in OpenAPI)
    return schema.type === 'object' || 
           !!schema.properties || 
           !!schema.allOf ||
           (!schema.type && !!schema.properties);
  }
}
