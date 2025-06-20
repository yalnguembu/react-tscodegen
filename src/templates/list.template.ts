// Template for generating React list components
// These template strings are processed by the contract-builder.ts

// Template for a list component
export const LIST_TEMPLATE = `
import { useState } from 'react';
import { {{typeName}} } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface {{typeName}}ListProps {
  data: {{typeName}}[];
  isLoading?: boolean;
  onEdit?: (item: {{typeName}}) => void;
  onDelete?: (item: {{typeName}}) => void;
  onPageChange?: (page: number) => void;
  totalPages?: number;
  currentPage?: number;
}

export function {{typeName}}List({ 
  data, 
  isLoading = false,
  onEdit,
  onDelete,
  onPageChange,
  totalPages = 1,
  currentPage = 1
}: {{typeName}}ListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Handle filtering data if needed
  const filteredData = searchQuery 
    ? data.filter(item => 
        Object.values(item).some(
          value => value && String(value).toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : data;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{{humanizedName}} List</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-4">Loading...</div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <table className="min-w-full divide-y">
            <thead className="bg-muted">
              <tr>
                {{tableHeaders}}
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No {{humanizedName.toLowerCase()}} found.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id || Math.random()}>
                    {{tableRows}}
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        {onEdit && (
                          <Button size="sm" variant="outline" onClick={() => onEdit(item)}>
                            Edit
                          </Button>
                        )}
                        {onDelete && (
                          <Button size="sm" variant="destructive" onClick={() => onDelete(item)}>
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          <span className="px-4 py-2">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}`;

// Template for table header
export const TABLE_HEADER_TEMPLATE = `<th className="px-4 py-2">{{headerName}}</th>`;

// Template for table row
export const TABLE_ROW_TEMPLATE = `<td className="px-4 py-2">{{cellValue}}</td>`;

// Template for generating list components for GET method responses

export const LIST_COMPONENT_TEMPLATE = `{{imports}}

export interface {{entityName}}ListProps {
  items: {{itemType}}[];
  loading?: boolean;
  error?: string | null;
  onEdit?: (item: {{itemType}}) => void;
  onDelete?: (item: {{itemType}}) => void;
  onView?: (item: {{itemType}}) => void;
  onRefresh?: () => void;
  className?: string;
  compact?: boolean;
  showActions?: boolean;
}

export function {{entityName}}List({
  items,
  loading = false,
  error = null,
  onEdit,
  onDelete,
  onView,
  onRefresh,
  className = '',
  compact = false,
  showActions = true
}: {{entityName}}ListProps) {
  
  if (loading) {
    return (
      <div className={\`{{entityNameLower}}-list loading \${className}\`}>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading {{entityNameLower}}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={\`{{entityNameLower}}-list error \${className}\`}>
        <div className="error-message">
          <h3>Error loading {{entityNameLower}}</h3>
          <p>{error}</p>
          {onRefresh && (
            <button onClick={onRefresh} className="btn btn-primary">
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className={\`{{entityNameLower}}-list empty \${className}\`}>
        <div className="empty-state">
          <h3>No {{entityNameLower}} found</h3>
          <p>There are no items to display.</p>
          {onRefresh && (
            <button onClick={onRefresh} className="btn btn-outline">
              Refresh
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={\`{{entityNameLower}}-list \${compact ? 'compact' : ''} \${className}\`}>
      <div className="list-header">
        <div className="list-info">
          <h2>{{listTitle}}</h2>
          <span className="item-count">{items.length} item{items.length !== 1 ? 's' : ''}</span>
        </div>
        {onRefresh && (
          <button onClick={onRefresh} className="btn btn-outline btn-sm">
            🔄 Refresh
          </button>
        )}
      </div>
      
      <div className="list-content">
        {items.map((item, index) => (
          <{{cardComponentName}}
            key={{{keyField}} || index}
            data={item}
            onEdit={onEdit}
            onDelete={onDelete}
            onView={onView}
            compact={compact}
            showActions={showActions}
          />
        ))}
      </div>
      
      <div className="list-footer">
        <p className="text-muted">
          Showing {items.length} {{entityNameLower}}{items.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}`;

export const LIST_IMPORTS_TEMPLATE = `import React from 'react';
import { {{itemType}} } from '../types';
import { {{cardComponentName}} } from './{{cardComponentFile}}';`;

export const LIST_INDEX_TEMPLATE = `// Auto-generated list components for GET method responses

{{exportStatements}}`;

export const LIST_EXPORT_STATEMENT_TEMPLATE = `export * from './{{fileName}}';`;
