# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v0.0.1.html).

## [Unreleased] - 2025-06-20

### Breaking Changes
- **Views Generator**: Views no longer generate React components, only data-safe classes for secure API data handling
- **Components Structure**: Components are now organized in separate directories (`cards/`, `lists/`, `forms/`)
- **Base Generator**: All generators now extend `EnhancedBaseGenerator` requiring implementation of abstract methods
- **Template Variables**: Updated template variable names for consistency across all generators

### Added
- **Enhanced Base Generator**: Modern OOP foundation with abstract methods, template engine integration, and robust error handling
- **Swagger Parser Integration**: Added `@apidevtools/swagger-parser` for robust OpenAPI spec parsing with dereferencing support
- **Template Engine**: New modular template architecture with variable substitution, loops, and conditionals (`src/core/template-engine.ts`)
- **Card Components**: Separate entity display components for reusability across all entity types
- **Complete List Coverage**: List components generated for ALL GET method responses (14 components generated vs previous subset)
- **Data-Safe Views**: Pure data classes with getters, validation, and safe field access without React dependencies
- **Component Generation Scripts**: Added individual npm scripts for all module types (`generate:types`, `generate:components`, etc.)
- **CLI Command Structure**: Individual commands for each generator type with proper option handling
- **Demo Commands**: Easy testing commands (`demo:components`, `demo:views`, etc.)

### Fixed
- **CLI Components Command**: Fixed components command routing that was incorrectly calling types generator
- **Template Variable Processing**: Resolved unprocessed template variables in generated components
- **TypeScript Compilation**: Fixed all TypeScript errors in generated code including method signatures and imports
- **Schema Detection**: Enhanced logic for detecting entity schemas vs response schemas
- **Import/Export Consistency**: Fixed missing exports and import path issues in generated files

### Enhanced
- **Component Generation Strategy**: 
  - Cards generated for 13 entity schemas 
  - Lists generated for ALL 14 GET response schemas
  - Forms generated for 5 POST request schemas
  - Proper separation between entity display and form components
- **Error Handling**: Comprehensive TypeScript error validation and user-friendly error messages
- **Logging**: Clear generation progress with file counts and categorization
- **Documentation**: Updated README with new architecture, usage examples, and component strategy
- **Package Scripts**: Cleaned up scripts removing demo scripts and keeping only generation commands

### Technical Improvements
- **OOP Architecture**: Refactored from procedural to robust object-oriented patterns
- **Template System**: Moved all presentation code to reusable template files
- **Schema Processing**: Enhanced OpenAPI spec processing with better allOf/$ref handling
- **File Organization**: Better output structure with logical component separation
- **Type Safety**: End-to-end TypeScript integration from API to UI components

## [1.0.0] - 2025-06-19

### Added
- Initial release with full ES Modules support
- TypeScript interfaces generation from OpenAPI specifications
- Zod validation schemas generation
- API service classes generation
- View objects generation
- React Query hooks generation (optional)
- React form and list components generation (optional)
- Mock API server with realistic fake data
- Comprehensive documentation
- ES Module architecture with proper import/export syntax
- Bundle configuration with esbuild
