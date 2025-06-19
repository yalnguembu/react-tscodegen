export interface OpenApiSpec {
  paths: Record<string, Record<string, EndpointDefinition>>;
  components: {
    schemas: Record<string, SchemaDefinition>;
    parameters?: Record<string, ParameterDefinition>;
    responses?: Record<string, ResponseDefinition>;
  };
}

export interface EndpointDefinition {
  tags?: string[];
  summary?: string;
  requestBody?: {
    required: boolean;
    content: {
      'application/json': {
        schema: SchemaReference | SchemaDefinition;
      };
    };
  };
  responses: Record<string, {
    description: string;
    content?: {
      'application/json': {
        schema: SchemaReference | SchemaDefinition;
      };
    };
  }>;
  parameters?: ParameterDefinition[];
}

export interface SchemaDefinition {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  items?: SchemaDefinition;
  enum?: string[];
  format?: string;
}

export interface SchemaReference {
  $ref: string;
}

export interface ParameterDefinition {
  name: string;
  in: 'path' | 'query' | 'header';
  required?: boolean;
  schema: SchemaDefinition;
}

export interface ResponseDefinition {
  description: string;
  content?: {
    'application/json': {
      schema: SchemaDefinition | SchemaReference;
    };
  };
}

export interface EndpointInfo {
  path: string;
  method: HttpMethod;
  endpoint: EndpointDefinition;
  operationId: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface GeneratorOptions {
  spec?: string;
  output?: string;
  outDir?: string;  // Added to support both parameter names
  hooks?: boolean | string;
  services?: boolean | string;
  components?: boolean | string;
  types?: boolean | string;
  schemas?: boolean | string;
  views?: boolean | string;
  mocks?: boolean | string;
  fakesData?: boolean | string;
  input?: string; // Path to input files (for hooks generator)
  forms?: boolean; // Flag to generate form components 
  list?: boolean; // Flag to generate list components
  fromAll?: boolean; // Flag to indicate that the generator is being called from generateAll
}
