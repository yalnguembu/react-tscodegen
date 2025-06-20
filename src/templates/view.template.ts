// Template for generating view classes with embedded schemas (data handling only)

export const VIEW_CLASS_TEMPLATE = `{{imports}}

// Auto-generated view class for {{entityName}} - Safe data handling from API
import { z } from 'zod';

// Embedded Zod schema for {{entityName}}View validation
{{zodSchema}}

export class {{entityName}}View {
  private data: {{entityName}};
  
  constructor(data: {{entityName}}) {
    // Validate data using the embedded schema
    this.data = {{entityName}}Schema.parse(data);
  }
  
  // Getter methods for safe property access
{{getterMethods}}
  
  // Utility methods
  toJSON(): {{entityName}} {
    return { ...this.data };
  }
  
  toString(): string {
    return JSON.stringify(this.data, null, 2);
  }
  
  equals(other: {{entityName}}View): boolean {
    return JSON.stringify(this.data) === JSON.stringify(other.data);
  }
  
  update(updates: Partial<{{entityName}}>): {{entityName}}View {
    const updatedData = { ...this.data, ...updates };
    return new {{entityName}}View(updatedData);
  }
  
  // Validation methods
  static validate(data: unknown): data is {{entityName}} {
    try {
      {{entityName}}Schema.parse(data);
      return true;
    } catch {
      return false;
    }
  }
  
  static safeParse(data: unknown): { success: true; data: {{entityName}} } | { success: false; error: string } {
    try {
      const parsed = {{entityName}}Schema.parse(data);
      return { success: true, data: parsed };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown validation error' };
    }
  }
  
  // Check if specific fields exist and are valid
  hasField(fieldName: keyof {{entityName}}): boolean {
    return this.data[fieldName] !== undefined && this.data[fieldName] !== null;
  }
  
  // Get raw field value (unsafe - use getters for safe access)
  getRawField(fieldName: keyof {{entityName}}): any {
    return this.data[fieldName];
  }
  
  // Serialize for API submission
  toApiPayload(): {{entityName}} {
    return this.toJSON();
  }
}`;

export const VIEW_IMPORTS_TEMPLATE = `import { {{entityName}} } from '../types';
import { {{entityName}}Schema } from '../schemas';`;

export const VIEW_GETTER_METHOD_TEMPLATE = `
  get{{capitalizedPropName}}(): {{propType}} {
    return this.data.{{propName}} ?? {{defaultValue}};
  }`;

export const VIEW_INDEX_TEMPLATE = `// Auto-generated view classes for safe API data handling

{{exportStatements}}`;
