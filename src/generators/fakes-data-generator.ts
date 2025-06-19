import { BaseGenerator } from '../base-generator.js';
import { FileSystemAPI } from '../file-system.js';
import { SchemaDefinition } from '../types.js';

export class FakesDataGenerator extends BaseGenerator {
  private _generatedFakes: Map<string, string> = new Map();
  
  generate(): Map<string, string> {
    const schemas = this.spec.components.schemas;
    
    Object.entries(schemas).forEach(([schemaName, schema]) => {
      const fakeDataGenerator = this.generateFakeDataGenerator(schemaName, schema);
      this._generatedFakes.set(schemaName, fakeDataGenerator);
    });
    
    return this._generatedFakes;
  }
  
  saveFiles(fs: FileSystemAPI): void {
    const fakesDir = this.getOutputDirectory('fake-data');
    fs.ensureDirectoryExists(fakesDir);
    
    let indexFileContent = '// Auto-generated fake data generators\n\n';
    
    this._generatedFakes.forEach((content, name) => {
      const fileName = `${this.toKebabCase(name)}-fake.ts`;
      const filePath = fs.joinPath(fakesDir, fileName);
      
      fs.writeFile(filePath, content);
      
      const exportName = `generate${name}`;
      indexFileContent += `export { ${exportName} } from './${this.toKebabCase(name)}-fake';\n`;
    });
    
    this.createIndexFile(fakesDir, indexFileContent, fs);
  }
  
  private generateFakeDataGenerator(schemaName: string, schema: SchemaDefinition): string {
    // Get all the properties with their types
    let imports = 'import { faker } from "@faker-js/faker";\n';
    const propertyGenerators: string[] = [];
    
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([propName, propSchema]) => {
        const propGenerator = this.generatePropertyFaker(propName, propSchema);
        propertyGenerators.push(`    ${propName}: ${propGenerator}`);
        
        // If property is a reference to another schema, add import
        if ('$ref' in propSchema) {
          const refType = this.extractNameFromRef(propSchema.$ref);
          imports += `import { generate${refType} } from './${this.toKebabCase(refType)}-fake';\n`;
        }
      });
    }
    
    const requiredProps = schema.required || [];
    
    return `${imports}\n/**
 * Generates fake data for ${schemaName}
 */
export function generate${schemaName}(override: Partial<${schemaName}> = {}): ${schemaName} {
  return {
${propertyGenerators.join(',\n')}
    ...override
  };
}

/**
 * Generates an array of fake ${schemaName} objects
 */
export function generate${schemaName}Array(count: number = 10, override: Partial<${schemaName}> = {}): ${schemaName}[] {
  return Array.from({ length: count }).map((_, index) => generate${schemaName}({ 
    ...(typeof override === 'object' ? override : {}),
    // Adding index to generate sequential IDs if id field exists
    ...(propertyGenerators.some(prop => prop.includes('id:')) ? { id: index + 1 } : {})
  }));
}
`;
  }
  
  private generatePropertyFaker(propName: string, propSchema: any): string {
    if ('$ref' in propSchema) {
      const refType = this.extractNameFromRef(propSchema.$ref);
      return `generate${refType}()`;
    }
    
    if (!propSchema.type) {
      return 'undefined';
    }
    
    switch (propSchema.type) {
      case 'string':
        if (propSchema.format === 'date-time' || propSchema.format === 'date') {
          return 'faker.date.recent().toISOString()';
        }
        if (propSchema.format === 'email') {
          return 'faker.internet.email()';
        }
        if (propSchema.format === 'uri' || propSchema.format === 'url') {
          return 'faker.internet.url()';
        }
        if (propSchema.format === 'uuid') {
          return 'faker.string.uuid()';
        }
        if (propSchema.enum) {
          const enumValues = JSON.stringify(propSchema.enum);
          return `${enumValues}[Math.floor(Math.random() * ${enumValues}.length)]`;
        }
        
        // Common field name patterns
        const nameLower = propName.toLowerCase();
        if (nameLower.includes('name') && nameLower.includes('first')) {
          return 'faker.person.firstName()';
        }
        if (nameLower.includes('name') && nameLower.includes('last')) {
          return 'faker.person.lastName()';
        }
        if (nameLower.includes('name') && nameLower.includes('full')) {
          return 'faker.person.fullName()';
        }
        if (nameLower === 'name' || nameLower.endsWith('name')) {
          if (nameLower.includes('company') || nameLower.includes('business')) {
            return 'faker.company.name()';
          }
          if (nameLower.includes('product')) {
            return 'faker.commerce.productName()';
          }
          return 'faker.person.fullName()';
        }
        if (nameLower.includes('phone')) {
          return 'faker.phone.number()';
        }
        if (nameLower.includes('address')) {
          return 'faker.location.streetAddress()';
        }
        if (nameLower.includes('city')) {
          return 'faker.location.city()';
        }
        if (nameLower.includes('country')) {
          return 'faker.location.country()';
        }
        if (nameLower.includes('zip') || nameLower.includes('postal')) {
          return 'faker.location.zipCode()';
        }        // Enhanced Lorem Ipsum text generation for various text fields
        if (nameLower.includes('description') || nameLower.includes('summary')) {
          return 'faker.lorem.paragraphs(3)';
        }
        if (nameLower.includes('title')) {
          return 'faker.lorem.sentence()';
        }
        if (nameLower.includes('detail')) {
          return 'faker.lorem.paragraphs(2)';
        }
        if (nameLower.includes('comment')) {
          return 'faker.lorem.sentences(3)';
        }
        if (nameLower.includes('content') || nameLower.includes('text')) {
          return 'faker.lorem.paragraphs(Math.floor(Math.random() * 3) + 1)';
        }
        if (nameLower.includes('snippet')) {
          return 'faker.lorem.lines(2)';
        }
        if (nameLower.includes('excerpt')) {
          return 'faker.lorem.paragraph()';
        }
        if (nameLower.includes('bio')) {
          return 'faker.lorem.paragraphs(1)';
        }
        if (nameLower.includes('image') || nameLower.includes('avatar') || nameLower.includes('photo')) {
          return 'faker.image.url()';
        }
        if (nameLower.includes('color')) {
          return 'faker.color.human()';
        }
        if (nameLower.includes('password')) {
          return 'faker.internet.password()';
        }
        if (nameLower.includes('username')) {
          return 'faker.internet.userName()';
        }
        if (nameLower.includes('id') && propSchema.format !== 'uuid') {
          return '`ID-${faker.string.alphanumeric(8).toUpperCase()}`';
        }
          // Default string - use Lorem Ipsum for all text fields
        if (propSchema.maxLength) {
          // If maxLength specified, ensure we don't exceed it
          const maxLength = Number(propSchema.maxLength);
          if (maxLength < 10) {
            return 'faker.string.alphanumeric(Math.min(5, maxLength))';
          } else if (maxLength < 30) {
            return 'faker.lorem.word()';
          } else if (maxLength < 100) {
            return 'faker.lorem.words(3)';
          } else {
            return 'faker.lorem.sentence()';
          }
        }
        
        // Default to 3 words
        return 'faker.lorem.words(3)';
          case 'integer':
      case 'number':
        const numNameLower = propName.toLowerCase();
        if (numNameLower.includes('id')) {
          return 'faker.number.int({ min: 1, max: 1000 })';
        }
        if (numNameLower.includes('age')) {
          return 'faker.number.int({ min: 18, max: 90 })';
        }
        if (numNameLower.includes('year')) {
          return 'faker.number.int({ min: 2000, max: 2023 })';
        }
        if (numNameLower.includes('price') || numNameLower.includes('cost')) {
          return 'Number(faker.commerce.price({ min: 10, max: 1000 }))';
        }
        if (numNameLower.includes('quantity') || numNameLower.includes('count') || numNameLower.includes('amount')) {
          return 'faker.number.int({ min: 1, max: 100 })';
        }
        if (numNameLower.includes('rating')) {
          return 'faker.number.float({ min: 0, max: 5, precision: 0.1 })';
        }
        
        // Default number
        return 'faker.number.int(100)';
        
      case 'boolean':
        return 'faker.datatype.boolean()';
        
      case 'array':
        if (propSchema.items && '$ref' in propSchema.items) {
          const refType = this.extractNameFromRef(propSchema.items.$ref);
          return `Array.from({ length: faker.number.int({ min: 1, max: 5 }) }).map(() => generate${refType}())`;
        }
        
        if (propSchema.items && propSchema.items.type) {
          const itemType = propSchema.items.type;
          if (itemType === 'string') {
            return 'Array.from({ length: faker.number.int({ min: 1, max: 5 }) }).map(() => faker.lorem.word())';
          }
          if (itemType === 'number' || itemType === 'integer') {
            return 'Array.from({ length: faker.number.int({ min: 1, max: 5 }) }).map(() => faker.number.int(100))';
          }
          if (itemType === 'boolean') {
            return 'Array.from({ length: faker.number.int({ min: 1, max: 5 }) }).map(() => faker.datatype.boolean())';
          }
        }
        
        return '[]';
        
      case 'object':
        if (!propSchema.properties) {
          return '{}';
        }
        
        const nestedProperties = Object.entries(propSchema.properties).map(([key, val]) => {
          return `${key}: ${this.generatePropertyFaker(key, val)}`;
        });
        
        return `{ ${nestedProperties.join(', ')} }`;
        
      default:
        return 'undefined';
    }
  }
}
