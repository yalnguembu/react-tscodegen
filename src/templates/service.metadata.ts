// Metadata for service templates
export const SERVICE_TEMPLATE_METADATA = {
  extension: ".service.ts",
  indexImportPattern: "export * from './{fileName}';",
  importStatements: [
    "import { AxiosInstance } from 'axios';",
    "import { httpClient } from '../utils/http-client';"
  ]
};
