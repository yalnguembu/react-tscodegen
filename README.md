# react-tscodegen

A powerful ES Module-based TypeScript code generator that transforms OpenAPI specifications into ready-to-use TypeScript code for frontend applications.

## Features

This generator creates the following from your OpenAPI specification:

- **TypeScript interfaces** for all schema definitions
- **Zod validation schemas** for runtime type checking
- **API service classes** for making HTTP requests
- **View objects** for safe data display
- **React Query hooks** (optional) for data fetching and mutations
- **React components** (optional) for forms and lists
- **Mock API server** with realistic fake data

## Quick Start

### Using npm script

```bash
# Generate everything
npm run generate-api

# Generate with hooks and components
npm run generate-api:full
```

### Using the generator directly

```bash
# Generate everything 
node --experimental-specifier-resolution=node generator.js

# Generate everything with hooks and components
node --experimental-specifier-resolution=node generator.js --hooks --components

# Specify custom paths
node --experimental-specifier-resolution=node generator.js --spec path/to/spec.yaml --output path/to/output
```

### Using the CLI directly for specific generators

```bash
# Generate all
node dist/index.js all --spec path/to/spec.yaml --output path/to/output

# Generate only types
node dist/index.js types --spec path/to/spec.yaml --output path/to/output

# Generate only services
node dist/index.js services --spec path/to/spec.yaml --output path/to/output

# Generate hooks from existing services
node dist/index.js hooks --input path/to/services --output path/to/output

# Generate only components
node dist/index.js components --spec path/to/spec.yaml --output path/to/output

# Generate only views
node dist/index.js views --spec path/to/spec.yaml --output path/to/output
```

## Generator Options

```
--spec <path>            Path to the OpenAPI specification file (YAML or JSON)
--output <path>          Output directory for generated files (default: ./src)
--hooks [path]           Generate React hooks for API services (optional: specify output directory)
--components [path]      Generate React components (optional: specify output directory)
--forms                  Generate form components (requires --components)
--list                   Generate list components (requires --components)
--help, -h               Show help information
```

## Examples

```bash
# Basic usage with default options
npm run generate-api

# Generate hooks and components
npm run generate-api -- --hooks --components

# Specify custom paths
npm run generate-api -- --spec path/to/spec.yaml --output ./src/generated --hooks ./src/hooks --components ./src/ui
```

## Generated Output Structure

```
<output-dir>/
  types/          # TypeScript interfaces
  schemas/        # Zod validation schemas
  services/       # API service classes
  views/          # View objects (optional)
  hooks/          # React Query hooks (if --hooks is specified)
  components/     # React components (if --components is specified)
    forms/        # Form components for creating and editing resources
    lists/        # List components for displaying resources
  mock-server/    # Mock API server with realistic fake data
    fake-data/    # Fake data generators
    response-utils/  # Response utilities for wrapping responses
```

## Usage Examples

### Using Generated Hooks

```tsx
import { useGetUsers, useCreateUser } from './hooks/user-hooks';

function UsersList() {
  const { data, isLoading } = useGetUsers();
  return /* render users */;
}

function CreateUserForm() {
  const createUser = useCreateUser({
    onSuccess: () => console.log('User created!')
  });
  
  const handleSubmit = (data) => {
    createUser.mutate(data);
  };
  
  return /* render form */;
}
```

### Using Generated Components

```tsx
import { UserList } from './components/lists/user-list';
import { UserCreateForm, UserEditForm } from './components/forms';

function UsersPage() {
  const [selectedUser, setSelectedUser] = useState(null);
  
  return (
    <div>
      {selectedUser ? (
        <UserEditForm 
          data={selectedUser}
          onSubmit={handleUpdateUser} 
          isLoading={isUpdating} 
        />
      ) : (
        <UserCreateForm 
          onSubmit={handleCreateUser} 
          isLoading={isCreating} 
        />
      )}
      
      <UserList 
        data={users} 
        isLoading={isLoading}
        onEdit={setSelectedUser}
        onDelete={handleDeleteUser}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
```

## Mock API Server

The generator creates a complete mock API server with realistic fake data based on your OpenAPI specification.

### Mock Server Features

1. **Realistic Fake Data**
   - Uses faker.js to generate appropriate data based on field names
   - Intelligent field name recognition for emails, names, dates, etc.
   - Lorem ipsum text for description fields
   - Sequential IDs for list endpoints

2. **Advanced Response Patterns**
   - Status code responses based on request patterns:
     - `id: 201` → Returns 201 Created
     - `id: 400` → Returns 400 Bad Request
     - `id: 404` → Returns 404 Not Found
     - Other error patterns: 401, 403, 500, etc.
   - Query parameter status code control: `?_status=404`
   - Error triggering via payload with `_error` field

3. **Standardized Response Format**
   ```json
   {
     "success": true,
     "data": { /* actual response data */ },
     "message": "Operation successful"
   }
   ```

4. **Pagination Support**
   - Works with `?page=1&perPage=20` query parameters
   - Returns pagination metadata with links to first, last, next pages

### Running the Mock Server

```bash
cd mock-server
npm install
npm start
```

Access the API at `http://localhost:3001/api` and documentation at `http://localhost:3001/api-docs`.

## Technical Implementation Details

### ES Module Architecture

This generator uses modern ES Modules (ESM) which offers several advantages:

- Better tree-shaking and dead code elimination
- Asynchronous module loading
- Top-level await support
- Cleaner import/export syntax
- Better compatibility with modern tools

Key implementation aspects:

1. **Import Statements**
   - Local imports include `.js` file extensions: `import { X } from './y.js'`
   - No CommonJS-style `require()` calls

2. **Directory Path Handling**
   - ES Modules don't have `__dirname`, so we use:
   ```javascript
   import { fileURLToPath } from 'url';
   import { dirname } from 'path';
   
   const __filename = fileURLToPath(import.meta.url);
   const __dirname = dirname(__filename);
   ```

3. **Bundle Configuration**
   - Uses esbuild with ES Module format
   - External dependencies to avoid compatibility issues

## Configuration

The generator can be customized using the `config.json` file in the generator directory. This allows you to:

1. Set default paths for input/output
2. Configure generator options
3. Customize templates

Example `config.json`:

```json
{
  "spec": {
    "default": "./api-specification.yaml",
    "description": "Path to the OpenAPI specification file"
  },
  "output": {
    "default": "./src",
    "description": "Base output directory for all generated files"
  },
  "paths": {
    "types": {
      "default": "types/api",
      "description": "Output directory for generated types"
    },
    "schemas": {
      "default": "schemas",
      "description": "Output directory for generated schemas"
    },
    "services": {
      "default": "services/api",
      "description": "Output directory for generated services"
    }
  },
  "templates": {
    "hook": {
      "path": "src/templates/hook.template.ts",
      "extension": ".hook.ts",
      "indexImportPattern": "export * from './{fileName}';",
      "importStatements": [
        "import { useMutation, useQuery } from '@tanstack/react-query';",
        "import { {serviceName} } from '../services/api';"
      ]
    }
  },
  "options": {
    "typesGeneration": {
      "enumAsUnion": true,
      "generateInterfaces": true
    },
    "hooksGeneration": {
      "useReactQuery": true,
      "servicesInputPath": null
    }
  }
}
```

## Development

### Building the Generator

```bash
# Install dependencies
npm install

# Build the generator
npm run build:prod

# Run tests
npm test
```

### Customizing Templates

The generator uses template-based code generation. You can customize the templates in the `src/templates` directory.

## Versioning and Releases

This project follows [Semantic Versioning](https://semver.org/) (SemVer).

- **Major version** (X.0.0): Breaking changes
- **Minor version** (0.X.0): New features, backward-compatible
- **Patch version** (0.0.X): Bug fixes, backward-compatible

### Version Commands

```bash
# Display current version
npm run version

# Run pre-release checks
npm run prerelease

# Create a patch release (bug fixes)
npm run release:patch

# Create a minor release (new features)
npm run release:minor

# Create a major release (breaking changes)
npm run release:major

# Create a GitHub release (after running one of the above)
npm run github-release
```

Each release automatically:
1. Updates the version in package.json
2. Creates a new entry in CHANGELOG.md
3. Commits the changes to git
4. Creates a git tag for the release

The GitHub release script:
1. Uses the GitHub CLI to create a release
2. Extracts release notes from CHANGELOG.md
3. Creates either a draft or published release

### Changelog

All notable changes are documented in the [CHANGELOG.md](CHANGELOG.md) file.
