// Type definitions
export interface TemplateMetadata {
  extension: string;
  indexImportPattern: string;
  importStatements: string[];
}

// Template metadata definitions
export const HOOK_TEMPLATE_METADATA: TemplateMetadata = {
  extension: ".hook.ts",
  indexImportPattern: "export * from './{fileName}';",
  importStatements: [
    "import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';",
    "import { {serviceName} } from '../services/api';"
  ]
};

export const FORM_TEMPLATE_METADATA: TemplateMetadata = {
  extension: ".form.tsx",
  indexImportPattern: "export * from './{fileName}';",
  importStatements: [
    "import React from 'react';",
    "import { useForm } from 'react-hook-form';",
    "import { zodResolver } from '@hookform/resolvers/zod';",
    "import { z } from 'zod';",
    "import { {schemaName}Schema } from '../../schemas';"
  ]
};

export const LIST_TEMPLATE_METADATA: TemplateMetadata = {
  extension: ".list.tsx",
  indexImportPattern: "export * from './{fileName}';",
  importStatements: [
    "import React from 'react';",
    "import { {typeName} } from '../../types/api';"
  ]
};

export const SERVICE_TEMPLATE_METADATA: TemplateMetadata = {
  extension: ".service.ts",
  indexImportPattern: "export * from './{fileName}';",
  importStatements: [
    "import { AxiosInstance } from 'axios';",
    "import { httpClient } from '../utils/http-client';"
  ]
};

export const VIEW_TEMPLATE_METADATA: TemplateMetadata = {
  extension: ".view.ts",
  indexImportPattern: "export * from './{fileName}';",
  importStatements: [
    "import { {typeName} } from '../types/api';"
  ]
};

export const MOCK_TEMPLATE_METADATA: TemplateMetadata = {
  extension: "-mock.ts",
  indexImportPattern: "export * from './{fileName}';",
  importStatements: [
    "import { ResponseUtils } from './response-utils';",
    "import { {typeName} } from '../types/api';"
  ]
};

export const FAKE_DATA_TEMPLATE_METADATA: TemplateMetadata = {
  extension: "-fake.ts",
  indexImportPattern: "export * from './{fileName}';",
  importStatements: [
    "import { faker } from '@faker-js/faker';",
    "import { {typeName} } from '../types/api';"
  ]
};

// Template metadata map
export const TEMPLATE_METADATA_MAP: Record<string, TemplateMetadata> = {
  hook: HOOK_TEMPLATE_METADATA,
  form: FORM_TEMPLATE_METADATA,
  list: LIST_TEMPLATE_METADATA,
  service: SERVICE_TEMPLATE_METADATA,
  view: VIEW_TEMPLATE_METADATA,
  mock: MOCK_TEMPLATE_METADATA,
  fakeData: FAKE_DATA_TEMPLATE_METADATA
};

// Template file exports
export * from './view.template.js';
export * from './service.template.js';
export * from './fake-data.template.js';
export * from './mock.template.js';
export * from './type.template.js';
export * from './schema.template.js';
export * from './hook.template.js';
export * from './form.template.js';
export * from './list.template.js';
export * from './card.template.js';

// Template metadata exports
export * from './view.metadata.js';
export * from './service.metadata.js';
export * from './fake-data.metadata.js';
export * from './mock.metadata.js';
export * from './hook.metadata.js';
export * from './form.metadata.js';
export * from './list.metadata.js';
