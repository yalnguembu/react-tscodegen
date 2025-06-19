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
