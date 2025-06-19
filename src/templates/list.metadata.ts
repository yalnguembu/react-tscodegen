// Metadata for list templates
export const LIST_TEMPLATE_METADATA = {
  extension: ".list.tsx",
  indexImportPattern: "export * from './{fileName}';",
  importStatements: [
    "import React from 'react';",
    "import { {typeName} } from '../../types/api';"
  ]
};
