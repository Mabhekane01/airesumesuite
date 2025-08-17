import React, { useState, KeyboardEvent, useEffect } from 'react';
import { clsx } from 'clsx';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button } from './Button';

interface BulletPointEditorProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  minItems?: number;
  maxItems?: number;
}

export function BulletPointEditor({
  label,
  value = [],
  onChange,
  placeholder = "Enter a bullet point...",
  required = false,
  error,
  helpText,
  minItems = 0,
  maxItems = 10
}: BulletPointEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempValue, setTempValue] = useState('');

  // Ensure value is always an array
  const safeValue = Array.isArray(value) ? value : [];

  const handleAddItem = () => {
    if (safeValue.length >= maxItems) return;
    
    const newItems = [...safeValue, ''];
    onChange(newItems);
    setEditingIndex(newItems.length - 1);
    setTempValue('');
  };

  const handleRemoveItem = (index: number) => {
    if (safeValue.length <= minItems) return;
    
    const newItems = safeValue.filter((_, i) => i !== index);
    onChange(newItems);
    
    if (editingIndex === index) {
      setEditingIndex(null);
      setTempValue('');
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const handleStartEditing = (index: number) => {
    setEditingIndex(index);
    setTempValue(safeValue[index] || '');
  };

  const handleSaveItem = (index: number) => {
    if (tempValue.trim()) {
      const newItems = [...safeValue];
      newItems[index] = tempValue.trim();
      onChange(newItems);
    } else {
      // If empty, remove the item
      handleRemoveItem(index);
    }
    setEditingIndex(null);
    setTempValue('');
  };

  const handleCancelEditing = () => {
    if (editingIndex !== null && !safeValue[editingIndex]) {
      // Remove empty item that was just added
      handleRemoveItem(editingIndex);
    }
    setEditingIndex(null);
    setTempValue('');
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveItem(index);
    } else if (e.key === 'Escape') {
      handleCancelEditing();
    }
  };

  const canAddMore = safeValue.length < maxItems;
  const canRemove = safeValue.length > minItems;
  

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-dark-text-primary">
        {label}
        {required && <span className="text-accent-danger ml-1">*</span>}
      </label>
      
      <div className={clsx(
        "space-y-2 p-3 border rounded-lg",
        error ? "border-accent-danger" : "border-dark-border",
        "bg-gray-800"
      )}>
        {safeValue.length === 0 && !editingIndex && (
          <div className="text-dark-text-muted text-sm italic py-2">
            No items added yet. Click "Add Item" to get started.
          </div>
        )}
        
        {safeValue.map((item, index) => (
          <div key={index} className="flex items-start space-x-2 group">
            <div className="flex-shrink-0 mt-2">
              <div className="w-2 h-2 bg-dark-text-secondary rounded-full"></div>
            </div>
            
            <div className="flex-1">
              {editingIndex === index ? (
                <div className="space-y-2">
                  <textarea
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    onKeyDown={(e) => handleKeyPress(e, index)}
                    placeholder={placeholder}
                    className={clsx(
                      "w-full p-2 border rounded text-sm",
                      "border-dark-border bg-dark-background text-dark-text-primary",
                      "focus:ring-2 focus:ring-accent-primary focus:border-accent-primary",
                      "placeholder-dark-text-muted resize-none"
                    )}
                    rows={2}
                    autoFocus
                  />
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveItem(index)}
                      disabled={!tempValue.trim()}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEditing}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="cursor-pointer p-2 rounded text-sm hover:bg-dark-border/50 transition-colors"
                  onClick={() => handleStartEditing(index)}
                >
                  {item || <span className="text-dark-text-muted italic">Click to edit...</span>}
                </div>
              )}
            </div>
            
            {canRemove && (
              <button
                onClick={() => handleRemoveItem(index)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-accent-danger hover:bg-accent-danger/10 rounded"
                title="Remove item"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        
        {/* Add button - show when not at max items */}
        <div className="mt-2">
          {safeValue.length < maxItems ? (
            <Button
              type="button"
              variant="outline" 
              size="sm"
              onClick={handleAddItem}
              className="w-full border-dashed border-dark-border hover:border-accent-primary text-dark-text-secondary hover:text-dark-text-primary"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          ) : (
            <p className="text-xs text-dark-text-muted text-center py-2">
              Maximum {maxItems} items reached
            </p>
          )}
        </div>
      </div>
      
      {error && (
        <p className="text-sm text-accent-danger">{error}</p>
      )}
      {helpText && !error && (
        <p className="text-sm text-dark-text-muted">{helpText}</p>
      )}
      
      {(minItems > 0 || maxItems < 50) && (
        <p className="text-xs text-dark-text-muted">
          {minItems > 0 && `Minimum ${minItems} item${minItems !== 1 ? 's' : ''} required. `}
          {maxItems < 50 && `Maximum ${maxItems} items allowed.`}
        </p>
      )}
    </div>
  );
}