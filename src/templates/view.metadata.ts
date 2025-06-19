// Metadata for view templates
export const VIEW_TEMPLATE_METADATA = {
  extension: ".view.ts",
  indexImportPattern: "export * from './{fileName}';",
  importStatements: [
    "import { {typeName} } from '../types/api';"
  ]
};
