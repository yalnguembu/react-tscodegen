# Configuration Script for API Generator

This script allows you to customize the API generator with your own templates, metadata and settings.

## Usage

```bash
npm run config -- [options]
```

## Options

- `--config <path>`: Path to a custom configuration JSON file
- `--output <path>`: Custom output directory for generated files
- `--spec <path>`: Path to API specification file (YAML or JSON)
- `--help`, `-h`: Show help information

## Configuration File Format

Create a JSON file with the following structure:

```json
{
  "outputDir": "./path/to/output",
  "apiSpec": "./path/to/api-spec.yaml",
  "paths": {
    "components": "custom-components",
    "services": "custom-services"
  },
  "templates": {
    "form": {
      "template": "./path/to/custom-form-template.ts",
      "metadata": "./path/to/custom-form-metadata.ts"
    },
    "list": {
      "template": "./path/to/custom-list-template.ts",
      "metadata": "./path/to/custom-list-metadata.ts"
    },
    "hook": {
      "template": "./path/to/custom-hook-template.ts",
      "metadata": "./path/to/custom-hook-metadata.ts"
    }
  },
  "options": {
    "componentsGeneration": {
      "useReactHookForm": true,
      "generateForms": true,
      "generateLists": true
    }
  }
}
```

## Custom Templates and Metadata

For each template type, you can provide both:

1. Template file (`template`): Contains the actual code template
2. Metadata file (`metadata`): Contains configuration for the template (extension, imports, etc.)

### Template Types

Available template types:
- `form`: Form components templates
- `list`: List components templates
- `hook`: React Query hooks templates
- `service`: API service templates
- `view`: View helper templates
- `mock`: API mock templates
- `fakeData`: Fake data generator templates

## Examples

### Using a configuration file:

```bash
npm run config -- --config ./my-config.json
```

### Using command line options:

```bash
npm run config -- --output ./custom-output --spec ./api-spec.yaml
```

### Running the generator after configuration:

```bash
npm run generate -- components --outDir ./custom-output
```

### Sample Custom Template Metadata

```typescript
// Example custom form.metadata.ts
export const FORM_TEMPLATE_METADATA = {
  extension: ".form.tsx",
  indexImportPattern: "export * from './{fileName}';",
  importStatements: [
    "import React from 'react';",
    "import { useForm } from 'react-hook-form';",
    "import { {schemaName} } from '../../schemas';"
  ]
};
```
