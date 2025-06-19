import { FileSystemAPI } from './file-system.js';
import { OpenApiSpec } from './types.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the equivalent of __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export abstract class BaseGenerator {
  protected spec: OpenApiSpec;
  protected basePath: string;
  protected config: any;
  
  constructor(spec: OpenApiSpec, basePath: string) {
    this.spec = spec;
    this.basePath = basePath;
    this.loadConfig();
  }
  
  protected loadConfig(): void {
    try {
      const configPath = path.resolve(__dirname, '../config.json');
      this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.error('Error loading config file:', error);
      this.config = {};
    }
  }
  
  protected toKebabCase(str: string): string {
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z])(?=[a-z])/g, '$1-$2')
      .toLowerCase();
  }
  
  protected createIndexFile(directory: string, content: string, fileSystem: FileSystemAPI): void {
    fileSystem.writeFile(fileSystem.joinPath(directory, 'index.ts'), content);
  }
  
  protected extractNameFromRef(ref: string): string {
    return ref.split('/').pop() || 'Unknown';
  }
    protected getOutputDirectory(key: string): string {
    // Handle simplified config structure - paths are now directly strings instead of objects
    const configPath = typeof this.config.paths?.[key] === 'string' ? 
      this.config.paths[key] : key;
    return path.join(this.basePath, configPath);
  }
  
  abstract generate(): Map<string, string>;
  abstract saveFiles(fs: FileSystemAPI): void;
}
