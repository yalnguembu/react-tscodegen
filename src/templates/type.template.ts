// Template for generating TypeScript types

export const TYPE_INTERFACE_TEMPLATE = `{{description}}export interface {{typeName}} {
{{properties}}
}`;

export const TYPE_PROPERTY_TEMPLATE = `  {{propertyName}}{{optional}}: {{propertyType}};`;

export const TYPE_ENUM_TEMPLATE = `{{description}}export enum {{enumName}} {
{{enumValues}}
}`;

export const TYPE_ENUM_VALUE_TEMPLATE = `  {{key}} = '{{value}}'`;

export const TYPE_UNION_TEMPLATE = `{{description}}export type {{typeName}} = {{unionTypes}};`;

export const TYPE_INDEX_TEMPLATE = `// Auto-generated TypeScript types from OpenAPI spec

{{exportStatements}}`;

export const TYPE_DESCRIPTION_TEMPLATE = `/**
 * {{description}}
 */
`;

export const TYPE_EXPORT_STATEMENT_TEMPLATE = `export * from './{{fileName}}';`;
