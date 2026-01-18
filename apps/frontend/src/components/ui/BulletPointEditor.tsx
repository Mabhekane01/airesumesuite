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
    <div className="space-y-4">
      <label className="block text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className={clsx(
        "space-y-6 p-8 border rounded-[1.5rem] transition-all",
        error ? "border-red-300 bg-red-50/30" : "border-surface-200 bg-surface-50/50"
      )}>
        {safeValue.length === 0 && !editingIndex && (
          <div className="text-text-tertiary text-xs font-bold italic py-4 ml-2 uppercase tracking-widest opacity-60">
            No items added yet. Click "Add Item" to get started.
          </div>
        )}
        
        <div className="space-y-4">
          {safeValue.map((item, index) => (
            <div key={index} className="flex items-start gap-4 group">
              <div className="flex-shrink-0 mt-3 ml-2">
                <div className="w-1.5 h-1.5 bg-brand-blue rounded-full"></div>
              </div>
              
              <div className="flex-1 min-w-0">
                {editingIndex === index ? (
                  <div className="space-y-4 bg-white p-6 rounded-2xl border border-brand-blue/30 shadow-sm animate-slide-up-soft">
                    <textarea
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      onKeyDown={(e) => handleKeyPress(e, index)}
                      placeholder={placeholder}
                      className={clsx(
                        "w-full p-2 border-none bg-transparent text-sm font-medium text-brand-dark",
                        "focus:ring-0 placeholder:text-text-muted resize-none leading-relaxed"
                      )}
                      rows={4}
                      autoFocus
                    />
                    <div className="flex items-center justify-between pt-3 border-t border-surface-100">
                      <div className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">
                        Press Enter to save
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEditing}
                          className="px-4 py-1.5 text-[10px] uppercase tracking-widest font-black"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveItem(index)}
                          disabled={!tempValue.trim()}
                          className="px-6 py-1.5 text-[10px] uppercase tracking-widest font-black shadow-glow-sm"
                        >
                          Save Point
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="cursor-pointer p-2.5 rounded-xl text-sm font-medium text-text-secondary hover:bg-white hover:text-brand-dark hover:shadow-sm transition-all border border-transparent hover:border-surface-200 break-words whitespace-pre-wrap"
                    onClick={() => handleStartEditing(index)}
                  >
                    {item || <span className="text-text-muted italic opacity-60">Click to edit parameter...</span>}
                  </div>
                )}
              </div>
              
              {canRemove && !editingIndex && (
                <button
                  onClick={() => handleRemoveItem(index)}
                  className="opacity-0 group-hover:opacity-100 transition-all p-2 text-text-tertiary hover:text-red-500 hover:bg-red-50 rounded-xl"
                  title="Remove item"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        
        {/* Add button - show when not at max items */}
        {!editingIndex && (
          <div className="mt-2">
            {canAddMore ? (
              <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-4 border-2 border-dashed border-surface-200 rounded-2xl text-text-tertiary hover:text-brand-blue hover:border-brand-blue/30 hover:bg-white transition-all flex items-center justify-center gap-2 group shadow-sm"
              >
                <PlusIcon className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Add Optimization Parameter</span>
              </button>
            ) : (
              <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest text-center py-2 opacity-60">
                Maximum {maxItems} items reached
              </p>
            )}
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-[10px] font-bold text-red-500 ml-1 uppercase tracking-widest">{error}</p>
      )}
      {helpText && !error && (
        <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest ml-1">{helpText}</p>
      )}
    </div>
  );
}
