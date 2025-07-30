import { useState, useCallback, useMemo } from 'react';
import { 
  ValidationResult, 
  ValidationError, 
  validateJobApplication,
  validateFieldRealTime,
  sanitizeInput 
} from '../utils/validation';

interface UseFormValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  sanitizeInputs?: boolean;
  debounceMs?: number;
}

export interface FormValidationState {
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValidating: boolean;
  isValid: boolean;
}

export interface FormValidationActions {
  validateField: (fieldName: string, value: any, additionalData?: any) => Promise<boolean>;
  validateForm: (data: any) => Promise<boolean>;
  setFieldTouched: (fieldName: string, touched?: boolean) => void;
  setFieldError: (fieldName: string, error: string) => void;
  clearFieldError: (fieldName: string) => void;
  clearAllErrors: () => void;
  reset: () => void;
}

const initialState: FormValidationState = {
  errors: {},
  touched: {},
  isValidating: false,
  isValid: false,
};

export const useFormValidation = (
  options: UseFormValidationOptions = {}
): [FormValidationState, FormValidationActions] => {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    sanitizeInputs = true,
    debounceMs = 300,
  } = options;

  const [state, setState] = useState<FormValidationState>(initialState);
  const [debounceTimeouts, setDebounceTimeouts] = useState<Record<string, NodeJS.Timeout>>({});

  const setFieldError = useCallback((fieldName: string, error: string) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [fieldName]: error },
      isValid: false,
    }));
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setState(prev => {
      const newErrors = { ...prev.errors };
      delete newErrors[fieldName];
      return {
        ...prev,
        errors: newErrors,
        isValid: Object.keys(newErrors).length === 0,
      };
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setState(prev => ({
      ...prev,
      errors: {},
      isValid: true,
    }));
  }, []);

  const setFieldTouched = useCallback((fieldName: string, touched = true) => {
    setState(prev => ({
      ...prev,
      touched: { ...prev.touched, [fieldName]: touched },
    }));
  }, []);

  const validateField = useCallback(async (
    fieldName: string, 
    value: any, 
    additionalData?: any
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      // Clear existing timeout for this field
      if (debounceTimeouts[fieldName]) {
        clearTimeout(debounceTimeouts[fieldName]);
      }

      // Set new timeout
      const timeoutId = setTimeout(() => {
        setState(prev => ({ ...prev, isValidating: true }));

        // Sanitize input if enabled
        const sanitizedValue = sanitizeInputs && typeof value === 'string' 
          ? sanitizeInput(value) 
          : value;

        // Validate field
        const validation = validateFieldRealTime(fieldName, sanitizedValue, additionalData);

        if (validation.isValid) {
          clearFieldError(fieldName);
        } else if (validation.errors.length > 0) {
          setFieldError(fieldName, validation.errors[0].message);
        }

        setState(prev => ({ ...prev, isValidating: false }));
        resolve(validation.isValid);

        // Clean up timeout
        setDebounceTimeouts(prev => {
          const newTimeouts = { ...prev };
          delete newTimeouts[fieldName];
          return newTimeouts;
        });
      }, debounceMs);

      setDebounceTimeouts(prev => ({
        ...prev,
        [fieldName]: timeoutId,
      }));
    });
  }, [debounceMs, sanitizeInputs, setFieldError, clearFieldError, debounceTimeouts]);

  const validateForm = useCallback(async (data: any): Promise<boolean> => {
    setState(prev => ({ ...prev, isValidating: true }));

    try {
      // Sanitize all string inputs if enabled
      const sanitizedData = sanitizeInputs ? sanitizeFormData(data) : data;

      // Validate entire form
      const validation = validateJobApplication(sanitizedData);

      // Update error state
      const errorMap: Record<string, string> = {};
      validation.errors.forEach((error: ValidationError) => {
        errorMap[error.field] = error.message;
      });

      setState(prev => ({
        ...prev,
        errors: errorMap,
        isValid: validation.isValid,
        isValidating: false,
      }));

      return validation.isValid;
    } catch (error) {
      console.error('Form validation error:', error);
      setState(prev => ({
        ...prev,
        errors: { general: 'Validation failed unexpectedly' },
        isValid: false,
        isValidating: false,
      }));
      return false;
    }
  }, [sanitizeInputs]);

  const reset = useCallback(() => {
    // Clear all timeouts
    Object.values(debounceTimeouts).forEach(timeout => clearTimeout(timeout));
    setDebounceTimeouts({});
    
    setState(initialState);
  }, [debounceTimeouts]);

  const actions: FormValidationActions = useMemo(() => ({
    validateField,
    validateForm,
    setFieldTouched,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    reset,
  }), [validateField, validateForm, setFieldTouched, setFieldError, clearFieldError, clearAllErrors, reset]);

  return [state, actions];
};

// Helper function to sanitize form data recursively
const sanitizeFormData = (data: any): any => {
  if (typeof data === 'string') {
    return sanitizeInput(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeFormData);
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeFormData(value);
    }
    return sanitized;
  }
  
  return data;
};

// Field-specific validation helpers
export const useFieldValidation = (
  fieldName: string,
  options: UseFormValidationOptions = {}
) => {
  const [validationState, validationActions] = useFormValidation(options);

  const fieldError = validationState.errors[fieldName];
  const fieldTouched = validationState.touched[fieldName];
  const showError = fieldTouched && fieldError;

  const validateThisField = useCallback((value: any, additionalData?: any) => {
    return validationActions.validateField(fieldName, value, additionalData);
  }, [fieldName, validationActions.validateField]);

  const setThisFieldTouched = useCallback((touched = true) => {
    validationActions.setFieldTouched(fieldName, touched);
  }, [fieldName, validationActions.setFieldTouched]);

  return {
    error: fieldError,
    touched: fieldTouched,
    showError,
    isValidating: validationState.isValidating,
    validate: validateThisField,
    setTouched: setThisFieldTouched,
    clearError: () => validationActions.clearFieldError(fieldName),
  };
};

// Validation status indicators
export const getValidationStatus = (
  errors: Record<string, string>,
  touched: Record<string, string>,
  fieldName: string
): 'success' | 'error' | 'warning' | 'default' => {
  const hasError = errors[fieldName];
  const isTouched = touched[fieldName];
  
  if (!isTouched) return 'default';
  if (hasError) return 'error';
  return 'success';
};

export const getValidationMessage = (
  errors: Record<string, string>,
  fieldName: string
): string | undefined => {
  return errors[fieldName];
};