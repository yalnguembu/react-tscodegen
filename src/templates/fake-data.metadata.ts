// Metadata for fake data templates
export const FAKE_DATA_TEMPLATE_METADATA = {
  extension: "-fake.ts",
  indexImportPattern: "export * from './{fileName}';",
  importStatements: [
    "import { faker } from '@faker-js/faker';",
    "import { {typeName} } from '../types/api';"
  ]
};
