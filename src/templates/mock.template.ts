// Template for generating mock server

export const MOCK_SERVER_TEMPLATE = `import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSuccessResponse, createErrorResponse, createPaginatedResponse } from './response-utils';

// In-memory data store for persistent mock data
class MockDataStore {
  private data: Map<string, any[]> = new Map();
  private idCounters: Map<string, number> = new Map();

  // Initialize with fake data
  init() {
    // Initialize data for each entity type
    this.seedData();
  }

  private seedData() {
    // Add some seed data for common entities
    const entities = [{{entityList}}];
    
    entities.forEach(entityType => {
      const seedData = [];
      for (let i = 1; i <= 10; i++) {
        seedData.push(this.generateSampleData(entityType, i));
      }
      this.data.set(entityType, seedData);
      this.idCounters.set(entityType, 10);
    });
  }

  private generateSampleData(entityType: string, id: number): any {
{{sampleDataGenerators}}
    return { id, name: \`Sample \${entityType} \${id}\` };
  }

{{dataStoreMethods}}
}

// Global data store instance
const dataStore = new MockDataStore();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Error simulation middleware
app.use((req, res, next) => {
  // Simulate random errors (5% chance)
  if (Math.random() < 0.05) {
    return res.status(500).json(createErrorResponse('Internal server error'));
  }
  
  // Simulate network delays
  const delay = Math.random() * 1000; // 0-1 second delay
  setTimeout(next, delay);
});

// Initialize data store
dataStore.init();

{{routeDefinitions}}

// Start server
app.listen(PORT, () => {
  console.log(\`Mock API server running on http://localhost:\${PORT}\`);
  console.log('Available endpoints:');
{{endpointList}}
});

export default app;`;

export const MOCK_ROUTE_TEMPLATE = `
// {{serviceName}} routes
{{routes}}`;

export const MOCK_GET_ROUTE_TEMPLATE = `app.get('{{path}}', (req, res) => {
  try {
{{getRouteLogic}}
  } catch (error) {
    res.status(500).json(createErrorResponse('Internal server error'));
  }
});`;

export const MOCK_POST_ROUTE_TEMPLATE = `app.post('{{path}}', (req, res) => {
  try {
{{postRouteLogic}}
  } catch (error) {
    res.status(400).json(createErrorResponse('Bad request'));
  }
});`;

export const MOCK_PUT_ROUTE_TEMPLATE = `app.put('{{path}}', (req, res) => {
  try {
{{putRouteLogic}}
  } catch (error) {
    res.status(400).json(createErrorResponse('Bad request'));
  }
});`;

export const MOCK_DELETE_ROUTE_TEMPLATE = `app.delete('{{path}}', (req, res) => {
  try {
{{deleteRouteLogic}}
  } catch (error) {
    res.status(400).json(createErrorResponse('Bad request'));
  }
});`;

export const MOCK_SAMPLE_DATA_GENERATOR_TEMPLATE = `    if (entityType === '{{entityName}}') {
      return {{sampleObject}};
    }`;

export const MOCK_DATA_STORE_METHOD_TEMPLATE = `
  {{methodName}}({{parameters}}) {
{{methodBody}}
  }`;

export const MOCK_ENDPOINT_LIST_ITEM_TEMPLATE = `  console.log('  {{method}} {{path}}');`;

export const MOCK_PACKAGE_JSON_TEMPLATE = `{
  "name": "api-mocks",
  "version": "1.0.0",
  "description": "Mock API server for development and testing",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "body-parser": "^1.20.2",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}`;

export const MOCK_README_TEMPLATE = `# API Mock Server

This is an auto-generated Express.js mock server that simulates the API defined in your OpenAPI specification.

## Features

- ✅ Full CRUD operations for all endpoints
- ✅ In-memory data persistence during runtime
- ✅ Error simulation (5% random error rate)
- ✅ Network delay simulation
- ✅ Pagination support
- ✅ CORS enabled for frontend development
- ✅ Request logging

## Usage

### Start the server:
\`\`\`bash
npm install
npm start
\`\`\`

The server will start on http://localhost:3001

### Available Endpoints:

{{endpointDocumentation}}

## Error Simulation

The mock server includes built-in error simulation:
- 5% chance of random 500 errors
- Network delays (0-1 second)
- Validation errors for malformed requests

## Data Persistence

Data is stored in memory and persists for the duration of the server session. Each restart will reset all data to the initial seed values.
`;
