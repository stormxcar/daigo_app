import React, { useCallback, useState, useEffect } from 'react';

interface AsyncFunction<T = any, R = any> {
  (args: T): Promise<R>;
}

interface UseAsyncState<R> {
  status: 'idle' | 'pending' | 'success' | 'error';
  data: R | null;
  error: Error | null;
}

export function useAsync<T = void, R = any>(
  asyncFunction: AsyncFunction<T, R>,
  immediate = true
) {
  const [state, setState] = useState<UseAsyncState<R>>({
    status: 'idle',
    data: null,
    error: null,
  });

  const execute = useCallback(
    async (args: T) => {
      setState({ status: 'pending', data: null, error: null });
      try {
        const response = await asyncFunction(args);
        setState({ status: 'success', data: response, error: null });
        return response;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState({ status: 'error', data: null, error: err });
        throw err;
      }
    },
    [asyncFunction]
  );

  return { ...state, execute };
}

// Hook for debouncing values
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Hook for managing pagination
interface UsePaginationReturn {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

export function usePagination(
  totalItems: number,
  initialPageSize: number = 20
): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalPages = Math.ceil(totalItems / pageSize);

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  }, [totalPages]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setCurrentPage(1);
  }, []);

  return {
    currentPage,
    totalPages,
    pageSize,
    nextPage,
    prevPage,
    goToPage,
    setPageSize,
  };
}

// Hook for managing form state
interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  setValues: (values: T) => void;
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldError: (field: keyof T, error: string) => void;
  setFieldTouched: (field: keyof T, touched: boolean) => void;
  resetForm: () => void;
  handleChange: (field: keyof T) => (value: any) => void;
}

export function useForm<T extends Record<string, any>>(
  initialValues: T,
  onSubmit?: (values: T) => Promise<void>
): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  }, []);

  const setFieldTouched = useCallback((field: keyof T, isTouched: boolean) => {
    setTouched((prev) => ({
      ...prev,
      [field]: isTouched,
    }));
  }, []);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const handleChange = useCallback(
    (field: keyof T) => (value: any) => {
      setFieldValue(field, value);
      setFieldTouched(field, true);
    },
    [setFieldValue, setFieldTouched]
  );

  return {
    values,
    errors,
    touched,
    setValues,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    resetForm,
    handleChange,
  };
}
