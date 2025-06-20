// Template for generating Zod schemas

export const SCHEMA_FILE_TEMPLATE = `{{imports}}

{{description}}export const {{schemaName}} = {{zodSchema}};

export type {{typeName}} = z.infer<typeof {{schemaName}}>;`;

export const SCHEMA_IMPORTS_TEMPLATE = `import { z } from 'zod';`;

export const SCHEMA_OBJECT_TEMPLATE = `z.object({
{{properties}}
})`;

export const SCHEMA_PROPERTY_TEMPLATE = `  {{propertyName}}: {{zodType}}`;

export const SCHEMA_ARRAY_TEMPLATE = `z.array({{itemType}})`;

export const SCHEMA_STRING_TEMPLATE = `z.string(){{constraints}}`;

export const SCHEMA_NUMBER_TEMPLATE = `z.number(){{constraints}}`;

export const SCHEMA_BOOLEAN_TEMPLATE = `z.boolean()`;

export const SCHEMA_ENUM_TEMPLATE = `z.enum([{{enumValues}}])`;

export const SCHEMA_UNION_TEMPLATE = `z.union([{{unionTypes}}])`;

export const SCHEMA_OPTIONAL_TEMPLATE = `.optional()`;

export const SCHEMA_NULLABLE_TEMPLATE = `.nullable()`;

export const SCHEMA_INDEX_TEMPLATE = `// Auto-generated Zod schemas from OpenAPI spec

{{exportStatements}}`;

export const SCHEMA_DESCRIPTION_TEMPLATE = `/**
 * {{description}}
 */
`;

export const SCHEMA_EXPORT_STATEMENT_TEMPLATE = `export * from './{{fileName}}';`;

// Zod constraint templates
export const SCHEMA_CONSTRAINTS = {
  minLength: `.min({{value}})`,
  maxLength: `.max({{value}})`,
  pattern: `.regex({{pattern}})`,
  minimum: `.min({{value}})`,
  maximum: `.max({{value}})`,
  email: `.email()`,
  url: `.url()`,
  uuid: `.uuid()`,
  int: `.int()`
};
