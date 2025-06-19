import { BaseGenerator } from '../base-generator.js';
import { FileSystemAPI } from '../file-system.js';
import { SchemaDefinition, SchemaReference } from '../types.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { CREATE_FORM_TEMPLATE, EDIT_FORM_TEMPLATE, FORM_FIELD_TEMPLATE } from '../templates/form.template.js';
import { LIST_TEMPLATE, TABLE_HEADER_TEMPLATE, TABLE_ROW_TEMPLATE } from '../templates/list.template.js';

// Get the equivalent of __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ComponentsGenerator extends BaseGenerator {
  private _generatedComponents: Map<string, string> = new Map();
  private _generateForms: boolean;
  private _generateLists: boolean;
  
  constructor(
    spec: any, 
    outputPath: string, 
    options: { generateForms?: boolean, generateLists?: boolean } = {}
  ) {
    super(spec, outputPath);
    this._generateForms = options.generateForms !== false; // Default to true if not specified
    this._generateLists = options.generateLists !== false; // Default to true if not specified
  }    generate(): Map<string, string> {
    // Process paths to identify schemas used in GET responses and request bodies
    const getResponseSchemas = new Set<string>();
    const postRequestSchemas = new Set<string>();
    const putPatchRequestSchemas = new Set<string>();
    
    console.log("Scanning OpenAPI paths for components generation...");

    // Scan all paths to identify schemas used in GET responses and request bodies
    Object.entries(this.spec.paths || {}).forEach(([path, methods]) => {
      Object.entries(methods || {}).forEach(([method, endpoint]) => {
        if (method.toUpperCase() === 'GET') {
          // Process GET responses (for list components)
          const successResponse = endpoint.responses?.['200'] || endpoint.responses?.['201'];
          if (successResponse?.content?.['application/json']?.schema) {
            const schema = successResponse.content['application/json'].schema;
            if ('$ref' in schema) {
              const schemaName = this.extractNameFromRef(schema.$ref);
              getResponseSchemas.add(schemaName);
              console.log(`Found GET response schema: ${schemaName} for path ${path}`);
            }
          }
        } else if (method.toUpperCase() === 'POST') {
          // Process POST request bodies (for create forms)
          if (endpoint.requestBody?.content?.['application/json']?.schema) {
            const schema = endpoint.requestBody.content['application/json'].schema;
            if ('$ref' in schema) {
              const schemaName = this.extractNameFromRef(schema.$ref);
              postRequestSchemas.add(schemaName);
              console.log(`Found POST request schema: ${schemaName} for path ${path}`);
            }
          }
        } else if (['PUT', 'PATCH'].includes(method.toUpperCase())) {
          // Process PUT/PATCH request bodies (for edit forms)
          if (endpoint.requestBody?.content?.['application/json']?.schema) {
            const schema = endpoint.requestBody.content['application/json'].schema;
            if ('$ref' in schema) {
              const schemaName = this.extractNameFromRef(schema.$ref);
              putPatchRequestSchemas.add(schemaName);
              console.log(`Found PUT/PATCH request schema: ${schemaName} for path ${path}`);
            }
          }
        }
      });
    });    // Log summary of schemas found
    console.log(`Found ${getResponseSchemas.size} GET response schemas for lists`);
    console.log(`Found ${postRequestSchemas.size} POST request schemas for create forms`);
    console.log(`Found ${putPatchRequestSchemas.size} PUT/PATCH request schemas for edit forms`);
    
    // Log the actual schema names for debugging
    console.log('GET response schemas:', Array.from(getResponseSchemas));
    console.log('POST request schemas:', Array.from(postRequestSchemas));
    console.log('PUT/PATCH request schemas:', Array.from(putPatchRequestSchemas));
    
    // Process schemas and generate components
    console.log('\nGenerating components for matching schemas...');
    Object.entries(this.spec.components.schemas || {}).forEach(([name, schema]) => {
      if (
        schema.type === 'object' && 
        !name.endsWith('View') && 
        !name.endsWith('Error') && 
        !name.includes('Response')
      ) {
        // Generate list components for GET responses
        if (this._generateLists && getResponseSchemas.has(name)) {
          console.log(`Generating list component for ${name}`);
          const listCode = this.generateListComponent(name, schema as SchemaDefinition);
          this._generatedComponents.set(`${name}List`, listCode);
        }
        
        // Generate form components if enabled
        if (this._generateForms) {
          // Generate create form for POST request bodies
          if (postRequestSchemas.has(name)) {
            console.log(`Generating create form for ${name}`);
            const createFormCode = this.generateCreateFormComponent(name, schema as SchemaDefinition);
            this._generatedComponents.set(`${name}CreateForm`, createFormCode);
          }
          
          // Generate edit form for PUT/PATCH request bodies
          if (putPatchRequestSchemas.has(name)) {
            console.log(`Generating edit form for ${name}`);
            const editFormCode = this.generateEditFormComponent(name, schema as SchemaDefinition);
            this._generatedComponents.set(`${name}EditForm`, editFormCode);
          }
        }
      } else {
        console.log(`Skipping schema ${name}: type=${(schema as any).type}, doesnt meet criteria for component generation`);
      }
    });
    
    return this._generatedComponents;
  }
    saveFiles(fs: FileSystemAPI): void {
    const componentsBasePath = this.getOutputDirectory('components');
    
    // Create directories for different types of components
    const formsDir = fs.joinPath(componentsBasePath, this.config.components?.forms?.default || 'forms');
    const createFormsDir = fs.joinPath(formsDir, 'create');
    const editFormsDir = fs.joinPath(formsDir, 'edit');
    const listsDir = fs.joinPath(componentsBasePath, this.config.components?.lists?.default || 'lists');
    
    fs.ensureDirectoryExists(createFormsDir);
    fs.ensureDirectoryExists(editFormsDir);
    fs.ensureDirectoryExists(listsDir);
    
    let createFormsIndexContent = '// Auto-generated create form components from API spec\n\n';
    let editFormsIndexContent = '// Auto-generated edit form components from API spec\n\n';
    let listsIndexContent = '// Auto-generated list components from API spec\n\n';
    
    const generatedFiles = {
      lists: [] as string[],
      createForms: [] as string[],
      editForms: [] as string[]
    };
    
    // Save each component to the appropriate directory
    this._generatedComponents.forEach((content, name) => {
      if (name.endsWith('List')) {
        // Save list component (only for GET responses)
        const fileName = `${this.toKebabCase(name)}.tsx`;
        const filePath = fs.joinPath(listsDir, fileName);
        fs.writeFile(filePath, content);
        
        // Add to lists index
        listsIndexContent += `export * from './${this.toKebabCase(name)}';\n`;
        generatedFiles.lists.push(filePath);
      } else if (name.endsWith('CreateForm')) {
        // Save create form component (for POST request bodies)
        const fileName = `${this.toKebabCase(name)}.tsx`;
        const filePath = fs.joinPath(createFormsDir, fileName);
        fs.writeFile(filePath, content);
        
        // Add to create forms index
        createFormsIndexContent += `export * from './${this.toKebabCase(name)}';\n`;
        generatedFiles.createForms.push(filePath);
      } else if (name.endsWith('EditForm')) {
        // Save edit form component (for PUT/PATCH request bodies)
        const fileName = `${this.toKebabCase(name)}.tsx`;
        const filePath = fs.joinPath(editFormsDir, fileName);
        fs.writeFile(filePath, content);
        
        // Add to edit forms index
        editFormsIndexContent += `export * from './${this.toKebabCase(name)}';\n`;
        generatedFiles.editForms.push(filePath);
      }
    });
    
    // Write index files
    fs.writeFile(fs.joinPath(createFormsDir, 'index.ts'), createFormsIndexContent);
    fs.writeFile(fs.joinPath(editFormsDir, 'index.ts'), editFormsIndexContent);
    fs.writeFile(fs.joinPath(listsDir, 'index.ts'), listsIndexContent);
    
    // Create a main forms index
    const formsIndexContent = `// Auto-generated form components from API spec\n\nexport * from './create';\nexport * from './edit';\n`;
    fs.writeFile(fs.joinPath(formsDir, 'index.ts'), formsIndexContent);
    
    // Create a main components index
    const mainIndexContent = `// Auto-generated components from API spec\n\nexport * from './forms';\nexport * from './lists';\n`;
    fs.writeFile(fs.joinPath(componentsBasePath, 'index.ts'), mainIndexContent);
    
    // Log summary of generated files
    console.log(`Generated Components:
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
  }
    private generateListComponent(name: string, schema: SchemaDefinition): string {
    const properties = schema.properties || {};
    
    // Pick properties to display in the list (first 3-5 properties)
    const displayProps = Object.keys(properties).slice(0, 5);
    
    // Generate column headers
    const columns = displayProps.map(propName => {
      const headerName = this.formatPropertyName(propName);
      return TABLE_HEADER_TEMPLATE.replace(/{{headerName}}/g, headerName);
    }).join('');
    
    // Generate row cells
    const cells = displayProps.map(propName => {
      return TABLE_ROW_TEMPLATE.replace(/{{cellValue}}/g, `{item.${propName}}`);
    }).join('');
    
    // Generate the human-readable name for display
    const humanizedName = this.formatPropertyName(name);
    
    // Apply template replacements
    return LIST_TEMPLATE
      .replace(/{{typeName}}/g, name)
      .replace(/{{columns}}/g, columns)
      .replace(/{{cells}}/g, cells)
      .replace(/{{humanizedName}}/g, humanizedName);
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
    
    switch (propSchema.type) {
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
  
  private formatPropertyName(name: string): string {
    return name
      // Insert a space before all capital letters
      .replace(/([A-Z])/g, ' $1')
      // Capitalize the first letter
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }
}
