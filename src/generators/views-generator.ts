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

export class ViewsGenerator extends BaseGenerator {
  private _generatedViews: Map<string, string> = new Map();
  
  generate(): Map<string, string> {
    Object.entries(this.spec.components.schemas).forEach(([name, schema]) => {
      if ((schema as SchemaDefinition).type === 'object' && 
          !name.endsWith('View') && 
          !name.includes('Error')) {
        const viewCode = this.generateViewClass(name, schema as SchemaDefinition);
        this._generatedViews.set(`${name}View`, viewCode);
      }
    });
    
    return this._generatedViews;
  }
  
  saveFiles(fs: FileSystemAPI): void {
    const viewsDir = this.getOutputDirectory('views');
    fs.ensureDirectoryExists(viewsDir);
    
    let indexFileContent = '// Auto-generated view objects from API spec\n\n';
    
    this._generatedViews.forEach((content, name) => {
      const fileName = `${this.toKebabCase(name)}.ts`;
      const filePath = fs.joinPath(viewsDir, fileName);
      
      const baseName = name.replace('View', '');
      const contentWithImports = `import { ${baseName} } from '../types';\nimport { ${baseName}Schema } from '../schemas';\n\n${content}`;
      
      fs.writeFile(filePath, contentWithImports);
      
      indexFileContent += `export * from './${this.toKebabCase(name)}';\n`;
    });
    
    this.createIndexFile(viewsDir, indexFileContent, fs);
  }
    private generateViewClass(name: string, schema: SchemaDefinition): string {
    const templatePath = path.resolve(__dirname, '../../', 
      typeof this.config.templates?.view === 'string' 
        ? this.config.templates.view 
        : (this.config.templates?.view?.path || '../templates/view.template.ts')
    );
    let viewTemplate = '';
    
    try {
      if (fs.existsSync(templatePath)) {
        viewTemplate = fs.readFileSync(templatePath, 'utf8');
        return viewTemplate.replace(/{{ModelName}}/g, name);
      }
    } catch (error) {
      console.error('Error loading view template:', error);
    }
    
    // Fallback to built-in template
    return `export class ${name}View {
  constructor(private data: ${name}) {}
  
  // Get the raw data
  get raw(): ${name} {
    return this.data;
  }
  
  // Get a clone of the data
  clone(): ${name} {
    return JSON.parse(JSON.stringify(this.data));
  }
  
  // Create a new view from raw data
  static fromData(data: ${name}): ${name}View {
    return new ${name}View(data);
  }
  
  // Create a new view from a partial object
  static create(data: Partial<${name}>): ${name}View {
    // Validate with zod schema
    const validated = ${name}Schema.parse(data);
    return new ${name}View(validated);
  }
}`;
  }
}
