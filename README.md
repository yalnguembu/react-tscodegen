# react-tscodegen

A modern, enterprise-grade TypeScript code generator that transforms OpenAPI specifications into production-ready TypeScript/React code with robust OOP architecture and data-safe patterns.

## 🚀 Features

This enhanced generator creates comprehensive, modular code from your OpenAPI specification:

### Core Generation
- **TypeScript interfaces** - Complete type definitions with proper inheritance
- **Zod validation schemas** - Runtime type checking and validation  
- **API service classes** - HTTP client services with error handling
- **Data-safe view classes** - Secure data access objects with getters and validation
- **React Query hooks** - Modern data fetching with caching and mutations
- **React components** - Card, list, and form components for rapid UI development
- **Mock services** - Realistic fake data generators for development and testing

### Architecture Enhancements
- **Enhanced Base Generator** - Modern OOP foundation with template engine
- **Swagger Parser Integration** - Robust OpenAPI spec parsing with dereferencing
- **Template System** - Modular template architecture for customization
- **Component Separation** - Clear separation between data logic and presentation
- **Type Safety** - End-to-end type safety from API to UI components

## 🎯 Component Generation Strategy

### Views (Data-Safe Classes)
- Generate data-safe classes for secure API data handling
- Provide getters with null safety and default values
- No React components - pure data logic only

### Components
- **Card Components** - Display individual entities with actions
- **List Components** - Display collections with card components  
- **Form Components** - Create/edit forms for POST/PUT operations
- Generated for **every GET method response** ensuring complete coverage

## 🛠 Quick Start

### Generate Everything
```bash
# Build and generate all components
npm run build
node dist/index.js all --spec api-specification.yaml --outDir src

# Generate specific components
node dist/index.js components --spec api-specification.yaml --outDir src
node dist/index.js views --spec api-specification.yaml --outDir src
```

### Demo Commands
```bash
# Test component generation
npm run demo:components

# Test view generation  
npm run demo:views

# Full generation test
npm run test:generation
```

## 📋 CLI Commands

### Available Commands
```bash
node dist/index.js <command> [options]

Commands:
  all [options]         Generate all API contracts (types, schemas, services, hooks, components)
  types [options]       Generate TypeScript types from OpenAPI schemas
  schemas [options]     Generate Zod schemas from OpenAPI schemas  
  services [options]    Generate API service classes from OpenAPI paths
  views [options]       Generate view helper classes from OpenAPI schemas
  mocks [options]       Generate API mock services from OpenAPI paths
  fakes-data [options]  Generate fake data generators from OpenAPI schemas
  hooks [options]       Generate React Query hooks from API services
  components [options]  Generate React components (cards, lists, forms) from OpenAPI schemas
```

### Common Options
```
-s, --spec <path>        Path to the OpenAPI specification file (YAML or JSON)
-o, --outDir <directory> Output directory for generated files (default: "./src")
--forms                  Generate form components (default: true)
--list                   Generate list components (default: true)  
--cards                  Generate card components (default: true)
-v, --verbose            Show verbose output
--help                   Show help information
```

## 📁 Generated Output Structure

```
<output-dir>/
├── types/api/           # TypeScript interfaces
│   ├── user.ts
│   ├── club.ts
│   └── index.ts
├── schemas/            # Zod validation schemas
│   ├── user-schema.ts
│   └── index.ts
├── services/           # API service classes  
│   ├── user-service.ts
│   └── index.ts
├── views/              # Data-safe view classes
│   ├── user-view.ts
│   └── index.ts
├── hooks/              # React Query hooks
│   ├── use-user.ts
│   └── index.ts
├── components/         # React components
│   ├── cards/          # Entity card components
│   │   ├── user-card.tsx
│   │   └── index.ts
│   ├── lists/          # List components (for GET responses)
│   │   ├── user-list.tsx
│   │   ├── paginated-users-list.tsx
│   │   └── index.ts
│   ├── forms/          # Form components
│   │   ├── create/     # POST request forms
│   │   │   ├── user-create-form.tsx
│   │   │   └── index.ts
│   │   ├── edit/       # PUT/PATCH request forms
│   │   │   └── index.ts
│   │   └── index.ts
│   └── index.ts
└── mocks/              # Mock services and data
    ├── user-mock.ts
    └── index.ts
```
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

function CreateUserForm() {## 💡 Usage Examples

### Using Generated View Classes (Data-Safe)
```typescript
import { UserView } from './views/user-view';

function UserProfile({ userData }: { userData: User }) {
  const userView = new UserView(userData);
  
  return (
    <div>
      <h1>{userView.getFullName()}</h1>  {/* Safe getter with fallbacks */}
      <p>{userView.getEmail()}</p>
      <p>Status: {userView.hasField('status') ? userView.getStatus() : 'Unknown'}</p>
      
      {/* Convert to API payload when needed */}
      <button onClick={() => api.updateUser(userView.toApiPayload())}>
        Update
      </button>
    </div>
  );
}
```

### Using Generated Hooks
```typescript
import { useUser, useCreateUser, useUpdateUser } from './hooks/use-user';

function UserManager() {
  const { data: users, isLoading } = useUsers();
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
import { UserCard } from './components/cards/user-card';
import { UserCreateForm, UserEditForm } from './components/forms';

function UsersPage() {
  const [selectedUser, setSelectedUser] = useState(null);
  const { data: users, isLoading } = useUsers();
  
  return (
    <div>
      {/* Card Component Example */}
      {selectedUser && (
        <UserCard 
          data={selectedUser}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
          showActions={true}
        />
      )}
      
      {/* Form Components */}
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
      
      {/* List Component - Uses Cards Internally */}
      <UserList 
        items={users} 
        loading={isLoading}
        onEdit={setSelectedUser}
        onDelete={handleDeleteUser}
        onView={handleViewUser}
        showActions={true}
        compact={false}
      />
    </div>
  );
}
```

## 🏗 Architecture Overview

### Enhanced Base Generator
- Modern OOP foundation with abstract methods
- Template engine integration for flexible code generation
- Robust error handling and logging
- Extensible generator pattern for custom generators

### Swagger Parser Integration
- Uses `@apidevtools/swagger-parser` for robust OpenAPI parsing
- Automatic dereferencing of `$ref` and `allOf` schemas
- Handles complex nested schemas and inheritance
- Fallback parsing for edge cases

### Template System
- Modular template architecture for easy customization
- Variable substitution with loop and conditional support
- Separate templates for different component types
- Clean separation of logic and presentation

### Component Generation Strategy
- **Data Logic**: View classes provide safe data access
- **UI Components**: Cards, lists, and forms for complete UI coverage
- **Smart Generation**: Only generates components for relevant schemas
- **Type Safety**: End-to-end TypeScript integration

## 📊 Generation Coverage

### Comprehensive Coverage
- **Types**: 100% of OpenAPI schemas converted to TypeScript
- **Views**: Data-safe classes for all object schemas  
- **Cards**: Individual entity display components
- **Lists**: ALL GET method responses get list components
- **Forms**: CREATE forms for POST endpoints, EDIT forms for PUT/PATCH

### Quality Assurance
- TypeScript compilation validation
- Template variable processing verification
- Schema relationship handling
- Import/export consistency checks

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

## 🆕 Recent Major Improvements (v2.0.0)

### Enhanced Architecture
- **Refactored to EnhancedBaseGenerator**: Modern OOP foundation with abstract methods
- **Template Engine Integration**: Flexible variable processing with loops and conditionals  
- **Swagger Parser**: Robust OpenAPI parsing with dereferencing support
- **Modular Templates**: Clean separation of logic and presentation

### Component Generation Overhaul
- **Data-Safe Views**: Pure data classes without React components
- **Card Components**: Separate entity display components for reusability
- **Complete List Coverage**: List components for ALL GET method responses  
- **Smart Schema Detection**: Enhanced logic for entity and response schema identification

### Developer Experience
- **CLI Command Fix**: Components command now works correctly
- **Better Error Handling**: Comprehensive TypeScript error validation
- **Demo Commands**: Easy testing with `npm run demo:components` and `npm run demo:views`
- **Improved Logging**: Clear generation progress and file counts

### Bug Fixes
- Fixed CLI routing for components command
- Resolved template variable processing issues
- Fixed TypeScript compilation errors in generated code
- Enhanced schema type detection and filtering

### Breaking Changes
- Views no longer generate React components (data classes only)
- Components are now organized in cards/, lists/, and forms/ subdirectories
- Enhanced base generator requires all generators to implement abstract methods
- Template variable names updated for consistency
