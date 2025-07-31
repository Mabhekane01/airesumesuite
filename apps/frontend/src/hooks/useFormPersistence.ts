import { useState, useEffect, useCallback, useRef } from 'react';

interface UseFormPersistenceOptions {
  key: string;
  debounceMs?: number;
  clearOnSubmit?: boolean;
  onRestore?: (data: any) => void;
}

export function useFormPersistence<T extends Record<string, any>>(
  initialData: T,
  options: UseFormPersistenceOptions
) {
  const { key, debounceMs = 500, clearOnSubmit = true, onRestore } = options;
  const [data, setData] = useState<T>(initialData);
  const [isRestored, setIsRestored] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const initialLoadRef = useRef(false);

  // Storage keys
  const storageKey = `form_draft_${key}`;
  const timestampKey = `form_timestamp_${key}`;

  // Load persisted data on mount
  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;

    try {
      const savedData = localStorage.getItem(storageKey);
      const savedTimestamp = localStorage.getItem(timestampKey);
      
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        const timestamp = savedTimestamp ? new Date(savedTimestamp) : null;
        
        // Only restore if data is recent (within 24 hours)
        const isRecent = timestamp && 
          (Date.now() - timestamp.getTime()) < 24 * 60 * 60 * 1000;
        
        if (isRecent && Object.keys(parsedData).length > 0) {
          setData(parsedData);
          setLastSaved(timestamp?.toISOString() || null);
          setIsRestored(true);
          onRestore?.(parsedData);
        }
      }
    } catch (error) {
      console.warn('Failed to restore form data:', error);
      // Clear corrupted data
      localStorage.removeItem(storageKey);
      localStorage.removeItem(timestampKey);
    }
  }, [storageKey, timestampKey, onRestore]);

  // Save to localStorage with debouncing
  const saveToStorage = useCallback((dataToSave: T) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      try {
        const timestamp = new Date();
        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        localStorage.setItem(timestampKey, timestamp.toISOString());
        setLastSaved(timestamp.toISOString());
      } catch (error) {
        console.warn('Failed to save form data:', error);
      }
    }, debounceMs);
  }, [storageKey, timestampKey, debounceMs]);

  // Update data and save
  const updateData = useCallback((updates: Partial<T> | ((prev: T) => T)) => {
    setData(prev => {
      const newData = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
      
      // Only save if this is a meaningful update (not just initial load)
      if (initialLoadRef.current) {
        saveToStorage(newData);
      }
      
      return newData;
    });
  }, [saveToStorage]);

  // Clear saved data
  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(timestampKey);
      setLastSaved(null);
      setIsRestored(false);
      
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    } catch (error) {
      console.warn('Failed to clear saved data:', error);
    }
  }, [storageKey, timestampKey]);

  // Submit handler
  const handleSubmit = useCallback((onSubmit: () => void | Promise<void>) => {
    return async () => {
      await onSubmit();
      if (clearOnSubmit) {
        clearSavedData();
      }
    };
  }, [clearOnSubmit, clearSavedData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Add beforeunload listener to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (lastSaved && isFormDirty()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    const isFormDirty = () => {
      // Check if current data differs significantly from initial data
      const currentString = JSON.stringify(data);
      const initialString = JSON.stringify(initialData);
      
      // Consider form dirty if it has substantial content
      const hasContent = Object.values(data).some(value => {
        if (typeof value === 'string') return value.trim().length > 0;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object' && value !== null) {
          return Object.values(value).some(v => 
            typeof v === 'string' ? v.trim().length > 0 : 
            Array.isArray(v) ? v.length > 0 : 
            Boolean(v)
          );
        }
        return Boolean(value);
      });

      return hasContent && currentString !== initialString;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [data, initialData, lastSaved]);

  return {
    data,
    updateData,
    clearSavedData,
    handleSubmit,
    isRestored,
    lastSaved,
    isDirty: lastSaved !== null
  };
}