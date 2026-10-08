import { useState, useCallback } from 'react';
import type { OfflineField, OfflineFormSchema } from '../SiteChatComponentNew.types';

type FieldValues = Record<string, unknown>;
type FieldErrors = Record<string, string>;

function validateField(field: OfflineField, value: unknown): string {
  if (field.required) {
    if (field.type === 'checkbox' && !value) {
      return `${field.label} is required.`;
    }
    if (
      field.type !== 'checkbox' &&
      (value === undefined || value === null || String(value).trim() === '')
    ) {
      return `${field.label} is required.`;
    }
  }

  if (field.type === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(String(value))) {
      return 'Please enter a valid email address.';
    }
  }

  if (field.type === 'phone') {
    const phoneRegex = /^\+?[\d\s\-().]{7,20}$/;
    if (value && !phoneRegex.test(String(value))) {
      return 'Please enter a valid phone number.';
    }
  }

  return '';
}

export function useOfflineForm(schema: OfflineFormSchema) {
  const initialValues: FieldValues = {};
  for (const field of schema.fields) {
    initialValues[field.id] = field.type === 'checkbox' ? false : '';
  }

  const [values, setValues] = useState<FieldValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const setValue = useCallback(
    (id: string, value: unknown) => {
      setValues((prev) => ({ ...prev, [id]: value }));

      if (submitted) {
        const field = schema.fields.find((f) => f.id === id);
        if (field) {
          const error = validateField(field, value);
          setErrors((prev) => ({ ...prev, [id]: error }));
        }
      }
    },
    [schema.fields, submitted],
  );

  const validate = useCallback((): boolean => {
    const newErrors: FieldErrors = {};
    let valid = true;

    for (const field of schema.fields) {
      const error = validateField(field, values[field.id]);
      newErrors[field.id] = error;
      if (error) valid = false;
    }

    setErrors(newErrors);
    return valid;
  }, [schema.fields, values]);

  const handleSubmit = useCallback(
    async (onSubmit: (values: FieldValues) => void | Promise<void>): Promise<boolean> => {
      setSubmitted(true);
      if (!validate()) return false;
      await onSubmit(values);
      return true;
    },
    [validate, values],
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setSubmitted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { values, errors, setValue, handleSubmit, reset };
}
