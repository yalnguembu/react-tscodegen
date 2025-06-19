import { BaseGenerator } from '../base-generator.js';
import { FileSystemAPI } from '../file-system.js';
import { SchemaDefinition } from '../types.js';
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
  
  constructor(
    spec: any, 
    outputPath: string, 
    options: { generateForms?: boolean, generateLists?: boolean } = {}
  ) {
    super(spec, outputPath);
    this._generateForms = options.generateForms !== false; // Default to true if not specified
    this._generateLists = options.generateLists !== false; // Default to true if not specified
  }
  
  generate(): Map<string, string> {
    Object.entries(this.spec.components.schemas).forEach(([name, schema]) => {
      // Only generate components for object types that aren't views, errors, etc.
      if (
        schema.type === 'object' && 
        !name.endsWith('View') && 
        !name.endsWith('Error') && 
        !name.includes('Response')
      ) {
        // Generate form components if enabled
        if (this._generateForms) {
          // Generate create form component
          const createFormCode = this.generateCreateFormComponent(name, schema as SchemaDefinition);
          this._generatedComponents.set(`${name}CreateForm`, createFormCode);
          
          // Generate edit form component
          const editFormCode = this.generateEditFormComponent(name, schema as SchemaDefinition);
          this._generatedComponents.set(`${name}EditForm`, editFormCode);
        }
        
        // Generate list component if enabled
        if (this._generateLists) {
          const listCode = this.generateListComponent(name, schema as SchemaDefinition);
          this._generatedComponents.set(`${name}List`, listCode);
        }
      }
    });
    
    return this._generatedComponents;
  }
  
  saveFiles(fs: FileSystemAPI): void {
    const componentsBasePath = this.getOutputDirectory('components');
    
    const formsDir = fs.joinPath(componentsBasePath, this.config.components?.forms?.default || 'forms');
    const listsDir = fs.joinPath(componentsBasePath, this.config.components?.lists?.default || 'lists');
    
    fs.ensureDirectoryExists(formsDir);
    fs.ensureDirectoryExists(listsDir);
    
    let formsIndexContent = '// Auto-generated form components from API spec\n\n';
    let listsIndexContent = '// Auto-generated list components from API spec\n\n';
    
    // Save each component to the appropriate directory
    this._generatedComponents.forEach((content, name) => {
      if (name.endsWith('List')) {
        // Save list component
        const fileName = `${this.toKebabCase(name)}.tsx`;
        const filePath = fs.joinPath(listsDir, fileName);
        fs.writeFile(filePath, content);
        
        // Add to lists index
        listsIndexContent += `export * from './${this.toKebabCase(name)}';\n`;
      } else if (name.endsWith('CreateForm') || name.endsWith('EditForm')) {
        // Save form component
        const fileName = `${this.toKebabCase(name)}.tsx`;
        const filePath = fs.joinPath(formsDir, fileName);
        fs.writeFile(filePath, content);
        
        // Add to forms index
        formsIndexContent += `export * from './${this.toKebabCase(name)}';\n`;
      }
    });
    
    fs.writeFile(fs.joinPath(formsDir, 'index.ts'), formsIndexContent);
    fs.writeFile(fs.joinPath(listsDir, 'index.ts'), listsIndexContent);
    
    // Create a main components index
    const mainIndexContent = `// Auto-generated components from API spec\n\nexport * from './forms';\nexport * from './lists';\n`;
    fs.writeFile(fs.joinPath(componentsBasePath, 'index.ts'), mainIndexContent);
    
    console.log(`Generated ${this._generatedComponents.size} React components.`);
  }
  
  private generateCreateFormComponent(name: string, schema: SchemaDefinition): string {
    const properties = schema.properties || {};
    const required = schema.required || [];
    
    const formFields = Object.entries(properties).map(([propName, propSchema]) => {
      const isRequired = required.includes(propName);
      return this.generateFormField(propName, propSchema, isRequired);
    }).join('\n      ');
    
    const defaultValues = Object.entries(properties).map(([propName, propSchema]) => {
      return `      ${propName}: undefined,`;
    }).join('\n');
    
    const templatePath = path.resolve(__dirname, '../../', this.config.templates?.form || '../templates/form.template.ts');
    let formTemplate = '';
    
    try {
      if (fs.existsSync(templatePath)) {
        formTemplate = fs.readFileSync(templatePath, 'utf8');
        return formTemplate
          .replace(/{{ModelName}}/g, name)
          .replace(/{{formType}}/g, 'Create')
          .replace(/{{defaultValues}}/g, defaultValues)
          .replace(/{{formFields}}/g, formFields);
      }
    } catch (error) {
      console.error('Error loading form template:', error);
    }
    
    // Fallback to built-in template
    return `import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ${name}, ${name}Schema } from '../schemas';
import { use${name.replace(/^./, c => c.toLowerCase())}Create } from '../hooks';

export function ${name}CreateForm() {
  const { mutate, isLoading } = use${name.replace(/^./, c => c.toLowerCase())}Create();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(${name}Schema),
    defaultValues: {
${defaultValues}
    },
  });
  
  const onSubmit = (data: ${name}) => {
    mutate(data);
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      ${formFields}
      
      <div className="mt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Creating...' : 'Create ${name}'}
        </button>
      </div>
    </form>
  );
}`;
  }
  
  private generateEditFormComponent(name: string, schema: SchemaDefinition): string {
    const properties = schema.properties || {};
    const required = schema.required || [];
    
    const formFields = Object.entries(properties).map(([propName, propSchema]) => {
      const isRequired = required.includes(propName);
      return this.generateFormField(propName, propSchema, isRequired);
    }).join('\n      ');
    
    const templatePath = path.resolve(__dirname, '../../', this.config.templates?.form || '../templates/form.template.ts');
    let formTemplate = '';
    
    try {
      if (fs.existsSync(templatePath)) {
        formTemplate = fs.readFileSync(templatePath, 'utf8');
        return formTemplate
          .replace(/{{ModelName}}/g, name)
          .replace(/{{formType}}/g, 'Edit')
          .replace(/{{defaultValues}}/g, 'data')
          .replace(/{{formFields}}/g, formFields);
      }
    } catch (error) {
      console.error('Error loading form template:', error);
    }
    
    return `import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ${name}, ${name}Schema } from '../schemas';
import { use${name.replace(/^./, c => c.toLowerCase())}Update } from '../hooks';

interface ${name}EditFormProps {
  data: ${name};
  id: string | number;
}

export function ${name}EditForm({ data, id }: ${name}EditFormProps) {
  const { mutate, isLoading } = use${name.replace(/^./, c => c.toLowerCase())}Update();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(${name}Schema),
    defaultValues: data,
  });
  
  const onSubmit = (formData: ${name}) => {
    mutate({ id, data: formData });
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      ${formFields}
      
      <div className="mt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Update ${name}'}
        </button>
      </div>
    </form>
  );
}`;
  }
  
  private generateListComponent(name: string, schema: SchemaDefinition): string {
    const properties = schema.properties || {};
    
    // Pick properties to display in the list (first 3-5 properties)
    const displayProps = Object.keys(properties).slice(0, 5);
    
    const columns = displayProps.map(propName => {
      return `
        <th className="px-4 py-2 bg-gray-100">${this.formatPropertyName(propName)}</th>`;
    }).join('');
    
    const cells = displayProps.map(propName => {
      return `
          <td className="px-4 py-2">{item.${propName}}</td>`;
    }).join('');
    
    const templatePath = path.resolve(__dirname, '../../', this.config.templates?.list || '../templates/list.template.ts');
    let listTemplate = '';
    
    try {
      if (fs.existsSync(templatePath)) {
        listTemplate = fs.readFileSync(templatePath, 'utf8');
        return listTemplate
          .replace(/{{ModelName}}/g, name)
          .replace(/{{columns}}/g, columns)
          .replace(/{{cells}}/g, cells);
      }
    } catch (error) {
      console.error('Error loading list template:', error);
    }
    
    return `import { use${name.replace(/^./, c => c.toLowerCase())}List } from '../hooks';
import { ${name} } from '../types';

export function ${name}List() {
  const { data, isLoading, error } = use${name.replace(/^./, c => c.toLowerCase())}List();
  
  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }
  
  if (error) {
    return <div className="p-4 text-red-500">Error loading data</div>;
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border">
        <thead>
          <tr>${columns}
          <th className="px-4 py-2 bg-gray-100">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((item: ${name}) => (
            <tr key={String(item.id)}>
              ${cells}
              <td className="px-4 py-2">
                <button 
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                  onClick={() => console.log('Edit', item)}
                >
                  Edit
                </button>
                <button 
                  className="px-3 py-1 ml-2 text-sm text-red-600 hover:text-red-800"
                  onClick={() => console.log('Delete', item)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}`;
  }
  
  private generateFormField(propName: string, propSchema: any, isRequired: boolean): string {
    const label = this.formatPropertyName(propName);
    
    if (propSchema.$ref) {
      // It's a reference to another schema
      return `<div>
        <label className="block text-sm font-medium text-gray-700">
          ${label}${isRequired ? ' *' : ''}
        </label>
        <select
          {...register('${propName}')}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select ${label}</option>
          {/* Options would be loaded from API */}
        </select>
        {errors.${propName} && (
          <p className="mt-1 text-sm text-red-600">{errors.${propName}?.message}</p>
        )}
      </div>`;
    }
    
    switch (propSchema.type) {
      case 'string':
        if (propSchema.enum) {
          // Enum type field
          const options = propSchema.enum.map((value: string) => 
            `<option value="${value}">${value}</option>`
          ).join('\n          ');
          
          return `<div>
        <label className="block text-sm font-medium text-gray-700">
          ${label}${isRequired ? ' *' : ''}
        </label>
        <select
          {...register('${propName}')}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select ${label}</option>
          ${options}
        </select>
        {errors.${propName} && (
          <p className="mt-1 text-sm text-red-600">{errors.${propName}?.message}</p>
        )}
      </div>`;
        } else if (propSchema.format === 'date-time' || propSchema.format === 'date') {
          // Date input
          return `<div>
        <label className="block text-sm font-medium text-gray-700">
          ${label}${isRequired ? ' *' : ''}
        </label>
        <input
          type="date"
          {...register('${propName}')}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.${propName} && (
          <p className="mt-1 text-sm text-red-600">{errors.${propName}?.message}</p>
        )}
      </div>`;
        } else if (propSchema.format === 'email') {
          // Email input
          return `<div>
        <label className="block text-sm font-medium text-gray-700">
          ${label}${isRequired ? ' *' : ''}
        </label>
        <input
          type="email"
          {...register('${propName}')}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.${propName} && (
          <p className="mt-1 text-sm text-red-600">{errors.${propName}?.message}</p>
        )}
      </div>`;
        } else {
          // Regular text input
          return `<div>
        <label className="block text-sm font-medium text-gray-700">
          ${label}${isRequired ? ' *' : ''}
        </label>
        <input
          type="text"
          {...register('${propName}')}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.${propName} && (
          <p className="mt-1 text-sm text-red-600">{errors.${propName}?.message}</p>
        )}
      </div>`;
        }
      
      case 'integer':
      case 'number':
        return `<div>
        <label className="block text-sm font-medium text-gray-700">
          ${label}${isRequired ? ' *' : ''}
        </label>
        <input
          type="number"
          {...register('${propName}', { valueAsNumber: true })}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.${propName} && (
          <p className="mt-1 text-sm text-red-600">{errors.${propName}?.message}</p>
        )}
      </div>`;
        
      case 'boolean':
        return `<div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            type="checkbox"
            {...register('${propName}')}
            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
        </div>
        <div className="ml-3 text-sm">
          <label className="font-medium text-gray-700">
            ${label}${isRequired ? ' *' : ''}
          </label>
        </div>
        {errors.${propName} && (
          <p className="mt-1 text-sm text-red-600">{errors.${propName}?.message}</p>
        )}
      </div>`;
        
      case 'array':
        // Simple representation, in reality would need a more complex component
        return `<div>
        <label className="block text-sm font-medium text-gray-700">
          ${label}${isRequired ? ' *' : ''} (Array)
        </label>
        <p className="text-xs text-gray-500">Array editing would require custom implementation</p>
        {errors.${propName} && (
          <p className="mt-1 text-sm text-red-600">{errors.${propName}?.message}</p>
        )}
      </div>`;
        
      case 'object':
        // Simple representation, in reality would need a more complex component
        return `<div>
        <label className="block text-sm font-medium text-gray-700">
          ${label}${isRequired ? ' *' : ''} (Object)
        </label>
        <p className="text-xs text-gray-500">Object editing would require custom implementation</p>
        {errors.${propName} && (
          <p className="mt-1 text-sm text-red-600">{errors.${propName}?.message}</p>
        )}
      </div>`;
        
      default:
        return `<div>
        <label className="block text-sm font-medium text-gray-700">
          ${label}${isRequired ? ' *' : ''}
        </label>
        <input
          type="text"
          {...register('${propName}')}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.${propName} && (
          <p className="mt-1 text-sm text-red-600">{errors.${propName}?.message}</p>
        )}
      </div>`;
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
}
