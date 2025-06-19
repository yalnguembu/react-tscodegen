// Metadata for form templates
export const FORM_TEMPLATE_METADATA = {
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
