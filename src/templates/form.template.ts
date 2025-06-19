// Template for generating React form components
// These template strings are processed by the contract-builder.ts

// Template for a create form component
export const CREATE_FORM_TEMPLATE = `
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { {{schemaName}} } from '../schemas/{{schemaFile}}';
import { {{typeName}} } from '../types';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface {{typeName}}CreateFormProps {
  onSubmit: (data: {{typeName}}) => void;
  isLoading?: boolean;
}

export function {{typeName}}CreateForm({ onSubmit, isLoading = false }: {{typeName}}CreateFormProps) {
  const form = useForm<{{typeName}}>({
    resolver: zodResolver({{schemaName}}),
    defaultValues: {
      {{defaultValues}}
    }
  });

  const handleSubmit = form.handleSubmit((data) => {
    onSubmit(data);
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {{formFields}}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create {{humanizedName}}'}
        </Button>
      </form>
    </Form>
  );
}`;

// Template for an edit form component
export const EDIT_FORM_TEMPLATE = `
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { {{schemaName}} } from '../schemas/{{schemaFile}}';
import { {{typeName}} } from '../types';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface {{typeName}}EditFormProps {
  data: {{typeName}};
  onSubmit: (data: {{typeName}}) => void;
  isLoading?: boolean;
}

export function {{typeName}}EditForm({ data, onSubmit, isLoading = false }: {{typeName}}EditFormProps) {
  const form = useForm<{{typeName}}>({
    resolver: zodResolver({{schemaName}}),
    defaultValues: data
  });

  // Update form when data changes
  useEffect(() => {
    if (data) {
      form.reset(data);
    }
  }, [form, data]);

  const handleSubmit = form.handleSubmit((formData) => {
    onSubmit(formData);
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {{formFields}}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Update {{humanizedName}}'}
        </Button>
      </form>
    </Form>
  );
}`;

// Template for a form field
export const FORM_FIELD_TEMPLATE = `
<FormField
  control={form.control}
  name="{{fieldName}}"
  render={({ field }) => (
    <FormItem>
      <FormLabel>{{fieldLabel}}</FormLabel>
      <FormControl>
        <Input 
          placeholder="{{fieldPlaceholder}}"
          type="{{fieldType}}"
          required={{{fieldRequired}}}
          {...field} 
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>`;

// Template for a select field
export const SELECT_FIELD_TEMPLATE = `
<FormField
  control={form.control}
  name="{{fieldName}}"
  render={({ field }) => (
    <FormItem>
      <FormLabel>{{fieldLabel}}</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select {{fieldLabel}}" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {{selectOptions}}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>`;
