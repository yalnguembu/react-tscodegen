// Template for generating card components

export const CARD_COMPONENT_TEMPLATE = `{{imports}}

export interface {{entityName}}CardProps {
  data: {{entityName}};
  className?: string;
  showActions?: boolean;
  onEdit?: (item: {{entityName}}) => void;
  onDelete?: (item: {{entityName}}) => void;
  onView?: (item: {{entityName}}) => void;
  compact?: boolean;
}

export function {{entityName}}Card({ 
  data, 
  className = '', 
  showActions = true,
  onEdit,
  onDelete,
  onView,
  compact = false
}: {{entityName}}CardProps) {
  const viewInstance = new {{entityName}}View(data);
  
  return (
    <div className={\`{{entityNameLower}}-card \${compact ? 'compact' : ''} \${className}\`}>
      <div className="card-header">
        <h3 className="card-title">{{cardTitle}}</h3>
        {showActions && (
          <div className="card-actions">
            {onView && (
              <button 
                onClick={() => onView(data)}
                className="btn btn-sm btn-outline"
                title="View Details"
              >
                👁️
              </button>
            )}
            {onEdit && (
              <button 
                onClick={() => onEdit(data)}
                className="btn btn-sm btn-outline"
                title="Edit"
              >
                ✏️
              </button>
            )}
            {onDelete && (
              <button 
                onClick={() => onDelete(data)}
                className="btn btn-sm btn-outline btn-danger"
                title="Delete"
              >
                🗑️
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="card-content">
{{cardFields}}
      </div>
      
      {!compact && (
        <div className="card-footer">
          <small className="text-muted">
            {{entityName}} • Last updated: {new Date().toLocaleDateString()}
          </small>
        </div>
      )}
    </div>
  );
}`;

export const CARD_IMPORTS_TEMPLATE = `import React from 'react';
import { {{entityName}} } from '../types';
import { {{entityName}}View } from '../views';`;

export const CARD_FIELD_TEMPLATE = `        <div className="field">
          <span className="field-label">{{fieldLabel}}:</span>
          <span className="field-value">{viewInstance.get{{capitalizedPropName}}()}</span>
        </div>`;

export const CARD_INDEX_TEMPLATE = `// Auto-generated card components for displaying entity data

{{exportStatements}}`;

export const CARD_EXPORT_STATEMENT_TEMPLATE = `export * from './{{fileName}}';`;
