import { BaseGenerator } from '../BaseGenerator.js';
import { FileSystemAPI } from '../FileSystem.js';
import { SchemaDefinition } from '../types.js';

export class FakesDataGenerator extends BaseGenerator {
  private _generatedFakes: Map<string, string> = new Map();
  
  protected getGeneratorKey(): string {
    return 'fakes';
  }

  protected performGeneration(): Map<string, string> {
    return this.generate();
  }

  protected async generateFiles(fs: FileSystemAPI): Promise<void> {
    this.saveFiles(fs);
  }
  
  generate(): Map<string, string> {
    const schemas = this.spec.components.schemas;
    
    Object.entries(schemas).forEach(([schemaName, schema]) => {
      const fakeDataFile = this.generateFakeDataFile(schemaName, schema);
      this._generatedFakes.set(schemaName, fakeDataFile);
    });
    
    return this._generatedFakes;
  }
  
  saveFiles(fs: FileSystemAPI): void {
    const fakesDir = this.getOutputDirectory('fake-data');
    fs.ensureDirectoryExists(fakesDir);
    
    let indexFileContent = '// Auto-generated fake data for testing and mocking\n\n';
    
    this._generatedFakes.forEach((content, name) => {
      const fileName = `${this.toKebabCase(name)}-fake.ts`;
      const filePath = fs.joinPath(fakesDir, fileName);
      
      fs.writeFile(filePath, content);
      
      const exportName = `${name.toLowerCase()}FakeData`;
      indexFileContent += `export { ${exportName} } from './${this.toKebabCase(name)}-fake';\n`;
    });
    
    this.createIndexFile(fakesDir, indexFileContent, fs);
  }
  
  private generateFakeDataFile(schemaName: string, schema: SchemaDefinition): string {
    // Generate multiple fake data instances for variety
    const sampleDataInstances = [];
    
    for (let i = 0; i < 5; i++) {
      const fakeData = this.generateFakeDataObject(schema, schemaName, i);
      sampleDataInstances.push(JSON.stringify(fakeData, null, 2));
    }
    
    let imports = `import { ${schemaName} } from '../types';\n\n`;
    
    // Generate the fake data file with plain objects
    const content = `${imports}// Fake data instances for ${schemaName}
// Ready to use for testing, mocking, and E2E tests

export const ${schemaName.toLowerCase()}FakeData: ${schemaName}[] = [
${sampleDataInstances.map(data => `  ${data}`).join(',\n')}
];

// Single instance for convenience
export const single${schemaName}: ${schemaName} = ${schemaName.toLowerCase()}FakeData[0];

// Random instance getter
export const getRandom${schemaName} = (): ${schemaName} => {
  const randomIndex = Math.floor(Math.random() * ${schemaName.toLowerCase()}FakeData.length);
  return ${schemaName.toLowerCase()}FakeData[randomIndex];
};
`;
    
    return content;
  }
  
  private generateFakeDataObject(schema: SchemaDefinition, schemaName: string, index: number): any {
    const fakeObj: any = {};
    
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([propName, propSchema]) => {
        fakeObj[propName] = this.generatePropertyValue(propName, propSchema, index);
      });
    }
    
    return fakeObj;
  }
  
  private generatePropertyValue(propName: string, propSchema: any, index: number): any {
    if ('$ref' in propSchema) {
      // For referenced schemas, return a simple object
      const refType = this.extractNameFromRef(propSchema.$ref);
      return this.generateSimpleObjectForRef(refType, index);
    }
    
    if (propSchema.type === 'array') {
      const itemCount = 2 + (index % 3); // Vary array length
      const items = [];
      for (let i = 0; i < itemCount; i++) {
        if (propSchema.items) {
          items.push(this.generatePropertyValue(`${propName}_item`, propSchema.items, i));
        }
      }
      return items;
    }
    
    switch (propSchema.type) {
      case 'string':
        return this.generateStringValue(propName, propSchema, index);
      case 'number':
      case 'integer':
        return this.generateNumberValue(propName, propSchema, index);
      case 'boolean':
        return index % 2 === 0;
      case 'object':
        if (propSchema.properties) {
          const obj: any = {};
          Object.entries(propSchema.properties).forEach(([nestedProp, nestedSchema]) => {
            obj[nestedProp] = this.generatePropertyValue(nestedProp, nestedSchema, index);
          });
          return obj;
        }
        return {};
      default:
        return this.generateStringValue(propName, propSchema, index);
    }
  }
  
  private generateStringValue(propName: string, propSchema: any, index: number): string {
    const normalizedProp = propName.toLowerCase();
    
    // Pattern-based generation
    if (propSchema.format === 'email' || normalizedProp.includes('email')) {
      return `user${index}@example.com`;
    }
    
    if (propSchema.format === 'date-time' || normalizedProp.includes('date') || normalizedProp.includes('time')) {
      const date = new Date();
      date.setDate(date.getDate() + index);
      return date.toISOString();
    }
    
    if (propSchema.format === 'date') {
      const date = new Date();
      date.setDate(date.getDate() + index);
      return date.toISOString().split('T')[0];
    }
    
    if (normalizedProp.includes('url') || normalizedProp.includes('link')) {
      return `https://example.com/${normalizedProp}${index}`;
    }
    
    if (normalizedProp.includes('id')) {
      return `${normalizedProp}-${index + 1}`;
    }
    
    if (normalizedProp.includes('name')) {
      const names = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
      return names[index % names.length];
    }
    
    if (normalizedProp.includes('description')) {
      return `Sample description for ${propName} item ${index + 1}`;
    }
    
    if (normalizedProp.includes('status')) {
      const statuses = ['active', 'inactive', 'pending', 'completed', 'draft'];
      return statuses[index % statuses.length];
    }
    
    if (normalizedProp.includes('type')) {
      const types = ['TypeA', 'TypeB', 'TypeC'];
      return types[index % types.length];
    }
    
    // Enum handling
    if (propSchema.enum && Array.isArray(propSchema.enum)) {
      return propSchema.enum[index % propSchema.enum.length];
    }
    
    // Default string generation
    return `Sample ${propName} ${index + 1}`;
  }
  
  private generateNumberValue(propName: string, propSchema: any, index: number): number {
    const normalizedProp = propName.toLowerCase();
    
    if (normalizedProp.includes('id')) {
      return index + 1;
    }
    
    if (normalizedProp.includes('count') || normalizedProp.includes('total')) {
      return (index + 1) * 10;
    }
    
    if (normalizedProp.includes('price') || normalizedProp.includes('amount')) {
      return parseFloat(((index + 1) * 25.99).toFixed(2));
    }
    
    if (normalizedProp.includes('page')) {
      return index + 1;
    }
    
    if (normalizedProp.includes('limit') || normalizedProp.includes('size')) {
      return 20;
    }
    
    // Use schema constraints if available
    const min = propSchema.minimum || 1;
    const max = propSchema.maximum || 100;
    
    return min + (index % (max - min + 1));
  }
  
  private generateSimpleObjectForRef(refType: string, index: number): any {
    // Generate a simple object for referenced types
    return {
      id: index + 1,
      name: `Sample ${refType} ${index + 1}`,
      type: refType
    };
  }
}
