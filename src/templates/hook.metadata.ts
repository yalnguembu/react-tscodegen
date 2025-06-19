// Metadata for hook template
export const HOOK_TEMPLATE_METADATA = {
  extension: ".hook.ts",
  indexImportPattern: "export * from './{fileName}';",
  importStatements: [
    "import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';",
    "import { {serviceName} } from '../services/api';"
  ]
};
