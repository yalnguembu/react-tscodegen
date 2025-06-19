// Metadata for mock templates
export const MOCK_TEMPLATE_METADATA = {
  extension: "-mock.ts",
  indexImportPattern: "export * from './{fileName}';",
  importStatements: [
    "import { ResponseUtils } from './response-utils';",
    "import { {typeName} } from '../types/api';"
  ]
};
