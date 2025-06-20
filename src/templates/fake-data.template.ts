// Template for generating fake data

export const FAKE_DATA_FILE_TEMPLATE = `{{imports}}

// Fake data instances for {{entityName}}
// Ready to use for testing, mocking, and E2E tests

export const {{entityNameLower}}FakeData: {{entityName}}[] = [
{{fakeDataInstances}}
];

// Export individual instances for convenience
{{namedExports}}

// Random data generator function
export function generate{{entityName}}FakeData(count: number = 1): {{entityName}}[] {
  const data: {{entityName}}[] = [];
  for (let i = 0; i < count; i++) {
    data.push({{randomDataGenerator}});
  }
  return data;
}`;

export const FAKE_DATA_IMPORTS_TEMPLATE = `import { {{entityName}} } from '../types';`;

export const FAKE_DATA_INSTANCE_TEMPLATE = `  {{objectData}}`;

export const FAKE_DATA_NAMED_EXPORT_TEMPLATE = `export const {{varName}} = {{entityNameLower}}FakeData[{{index}}];`;

export const FAKE_DATA_RANDOM_GENERATOR_TEMPLATE = `{
{{randomProperties}}
  }`;

export const FAKE_DATA_RANDOM_PROPERTY_TEMPLATE = `    {{propName}}: {{randomValue}}`;

export const FAKE_DATA_INDEX_TEMPLATE = `// Auto-generated fake data from API spec

{{exportStatements}}`;

// Random value generators for different types
export const FAKE_DATA_GENERATORS = {
  string: `"Sample string " + Math.random().toString(36).substring(7)`,
  number: `Math.floor(Math.random() * 1000) + 1`,
  integer: `Math.floor(Math.random() * 1000) + 1`,
  boolean: `Math.random() > 0.5`,
  email: `"user" + Math.floor(Math.random() * 1000) + "@example.com"`,
  date: `new Date(Date.now() - Math.random() * 31536000000).toISOString().split('T')[0]`,
  dateTime: `new Date(Date.now() - Math.random() * 31536000000).toISOString()`,
  uuid: `"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  })`,
  array: `[]`,
  object: `{}`
};
