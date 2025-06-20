// Template for generating React Query hook files
// These template strings are processed by the contract-builder.ts

// Template for a query hook (GET operations)
export const QUERY_HOOK_TEMPLATE = `
/**
 * Hook for {{methodName}} operation
 */
export function {{methodName}}({{params}}options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['{{resourceName}}', '{{serviceMethodName}}'{{hasParams}}],
    queryFn: () => {{serviceName}}.{{serviceMethodName}}({{methodParams}}),
    ...options
  });
}
`;

// Template for a mutation hook (POST, PUT, DELETE, PATCH operations)
export const MUTATION_HOOK_TEMPLATE = `
/**
 * Hook for {{methodName}} operation
 */
export function {{methodName}}(options?: { onSuccess?: () => void; onError?: (error: any) => void }) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({{params}}) => {{serviceName}}.{{serviceMethodName}}({{methodParams}}),
    onSuccess: () => {
      // Invalidate related queries after mutation
      queryClient.invalidateQueries({ queryKey: ['{{resourceName}}'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      options?.onError?.(error);
    }
  });
}
`;

// Template for hook file imports
export const HOOK_IMPORTS_TEMPLATE = `
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { {{importedTypes}} } from '../types';
import { {{serviceName}}, {{serviceLower}} } from '../services/{{serviceFile}}';
`;
