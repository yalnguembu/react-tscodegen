import fs from 'fs';
import path from 'path';

export interface FileSystemAPI {
  writeFile(path: string, content: string): void;
  joinPath(basePath: string, ...paths: string[]): string;
  ensureDirectoryExists(dirPath: string): void;
  readDirectory?(dirPath: string): string[]; // Optional method to read directory contents
  readFile?(filePath: string, encoding?: string): string; // Optional method to read file contents
}

export class NodeFileSystem implements FileSystemAPI {
  writeFile(path: string, content: string): void {
    fs.writeFileSync(path, content, 'utf8');
  }

  joinPath(basePath: string, ...paths: string[]): string {
    return path.join(basePath, ...paths);
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
}
