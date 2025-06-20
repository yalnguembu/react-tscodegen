import fs from 'fs';
import path from 'path';

export interface FileSystemAPI {
  writeFile(path: string, content: string): void;
  joinPath(basePath: string, ...paths: string[]): string;
  ensureDirectoryExists(dirPath: string): void;
  readDirectory?(dirPath: string): string[]; // Optional method to read directory contents
  readFile?(filePath: string, encoding?: string): string; // Optional method to read file contents
  getWrittenFiles(): string[]; // Method to get all written files
  resetWrittenFiles(): void; // Method to reset the list of written files
  getWrittenFilesByDirectory(): Record<string, string[]>; // Method to get written files grouped by directory
}

export class NodeFileSystem implements FileSystemAPI {
  private writtenFiles: string[] = [];
  
  writeFile(path: string, content: string): void {
    fs.writeFileSync(path, content, 'utf8');
    // Track the file path
    this.writtenFiles.push(path);
  }
  
  getWrittenFiles(): string[] {
    return [...this.writtenFiles];
  }
  
  resetWrittenFiles(): void {
    this.writtenFiles = [];
  }

  joinPath(basePath: string, ...paths: string[]): string {
    try {
      if (!paths || paths.length === 0) {
        return basePath;
      }
      
      // Ensure all paths are strings
      const validPaths = paths.filter(p => typeof p === 'string');
      
      if (validPaths.length !== paths.length) {
        console.warn('Warning: Some paths were filtered out because they were not strings');
      }
      
      return path.join(basePath, ...validPaths);
    } catch (error) {
      console.error('Error joining paths:', error);
      console.error('basePath:', basePath);
      console.error('paths:', paths);
      // Return a safe fallback
      return basePath;
    }
  }

  ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
  
  readDirectory(dirPath: string): string[] {
    if (!fs.existsSync(dirPath)) {
      return [];
    }
    return fs.readdirSync(dirPath);
  }
  readFile(filePath: string, encoding: BufferEncoding = 'utf8'): string {
    return fs.readFileSync(filePath, { encoding });
  }

  getWrittenFilesByDirectory(): Record<string, string[]> {
    const filesByDirectory: Record<string, string[]> = {};
    
    for (const filePath of this.writtenFiles) {
      const directory = path.dirname(filePath);
      if (!filesByDirectory[directory]) {
        filesByDirectory[directory] = [];
      }
      filesByDirectory[directory].push(path.basename(filePath));
    }
    
    return filesByDirectory;
  }
}
