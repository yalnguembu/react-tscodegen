// Template engine for processing templates with variable substitution

export interface TemplateVariables {
  [key: string]: string | string[] | TemplateVariables | TemplateVariables[];
}

export class TemplateEngine {
  /**
   * Process a template string by replacing variables with values
   * Variables are in the format {{variableName}}
   */
  static process(template: string, variables: TemplateVariables): string {
    let result = template;
    
    // Replace all variables in the template
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      
      if (Array.isArray(value)) {
        result = result.replace(regex, value.join('\n'));
      } else if (typeof value === 'object') {
        result = result.replace(regex, JSON.stringify(value, null, 2));
      } else {
        result = result.replace(regex, String(value));
      }
    });
    
    return result;
  }

  /**
   * Process a template with conditional blocks
   * Supports {{#if condition}}...{{/if}} syntax
   */
  static processConditional(template: string, variables: TemplateVariables): string {
    let result = template;
    
    // Handle conditional blocks
    const conditionalRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
    result = result.replace(conditionalRegex, (match, condition, content) => {
      if (variables[condition]) {
        return this.process(content, variables);
      }
      return '';
    });
    
    return this.process(result, variables);
  }

  /**
   * Process a template with loops
   * Supports {{#each items}}...{{/each}} syntax
   */
  static processLoop(template: string, variables: TemplateVariables): string {
    let result = template;
      // Handle each loops
    const loopRegex = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g;
    result = result.replace(loopRegex, (match, arrayName, content) => {
      const items = variables[arrayName];
      if (Array.isArray(items)) {
        return items.map((item, index) => {
          const itemVariables: TemplateVariables = {
            ...variables,
            ...(typeof item === 'object' && item !== null ? item : { value: item }),
            index: index.toString(),
            isFirst: (index === 0).toString(),
            isLast: (index === items.length - 1).toString()
          };
          return this.process(content, itemVariables);
        }).join('\n');
      }
      return '';
    });
    
    return this.process(result, variables);
  }

  /**
   * Process a template with all features (conditionals, loops, variables)
   */
  static processAdvanced(template: string, variables: TemplateVariables): string {
    let result = template;
    
    // Process in order: loops, conditionals, then variables
    result = this.processLoop(result, variables);
    result = this.processConditional(result, variables);
    result = this.process(result, variables);
    
    return result;
  }

  /**
   * Helper methods for common transformations
   */
  static toCamelCase(str: string): string {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  }

  static toPascalCase(str: string): string {
    return str.replace(/(^|-)([a-z])/g, (g) => g.slice(-1).toUpperCase());
  }

  static toKebabCase(str: string): string {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
  }

  static toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  }

  static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Apply transformations to template variables
   */
  static applyTransformations(variables: TemplateVariables): TemplateVariables {
    const transformed: TemplateVariables = { ...variables };
    
    Object.entries(variables).forEach(([key, value]) => {
      if (typeof value === 'string') {
        // Add common transformations
        transformed[`${key}CamelCase`] = this.toCamelCase(value);
        transformed[`${key}PascalCase`] = this.toPascalCase(value);
        transformed[`${key}KebabCase`] = this.toKebabCase(value);
        transformed[`${key}SnakeCase`] = this.toSnakeCase(value);
        transformed[`${key}Capitalized`] = this.capitalize(value);
        transformed[`${key}Lower`] = value.toLowerCase();
        transformed[`${key}Upper`] = value.toUpperCase();
      }
    });
    
    return transformed;
  }
}
