import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { 
  Square, Type, CheckSquare, Circle, Calendar, Mail, Phone,
  FileText, List, Hash, DollarSign, Percent, Globe, MapPin,
  User, Key, Eye, EyeOff, Lock, Unlock, Plus, Trash2
} from 'lucide-react';
import { clsx } from 'clsx';

type FormFieldType = 
  | 'text' 
  | 'textarea' 
  | 'checkbox' 
  | 'radio' 
  | 'dropdown' 
  | 'date' 
  | 'email' 
  | 'phone' 
  | 'number' 
  | 'currency' 
  | 'percentage' 
  | 'url' 
  | 'password';

interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  options?: string[]; // For dropdown/radio
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  style: {
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
  };
}

interface FormFieldEditorProps {
  fields: FormField[];
  selectedFieldId?: string;
  onFieldAdd: (type: FormFieldType) => void;
  onFieldUpdate: (id: string, updates: Partial<FormField>) => void;
  onFieldDelete: (id: string) => void;
  onFieldSelect: (id: string) => void;
}

export default function FormFieldEditor({
  fields,
  selectedFieldId,
  onFieldAdd,
  onFieldUpdate,
  onFieldDelete,
  onFieldSelect
}: FormFieldEditorProps) {
  const [showFieldTypes, setShowFieldTypes] = useState(false);
  const selectedField = fields.find(f => f.id === selectedFieldId);

  const fieldTypes = [
    { type: 'text' as FormFieldType, label: 'Text Field', icon: Type, color: 'text-teal-400' },
    { type: 'textarea' as FormFieldType, label: 'Text Area', icon: FileText, color: 'text-green-400' },
    { type: 'checkbox' as FormFieldType, label: 'Checkbox', icon: CheckSquare, color: 'text-emerald-400' },
    { type: 'radio' as FormFieldType, label: 'Radio Button', icon: Circle, color: 'text-pink-400' },
    { type: 'dropdown' as FormFieldType, label: 'Dropdown', icon: List, color: 'text-yellow-400' },
    { type: 'date' as FormFieldType, label: 'Date Picker', icon: Calendar, color: 'text-red-400' },
    { type: 'email' as FormFieldType, label: 'Email', icon: Mail, color: 'text-cyan-400' },
    { type: 'phone' as FormFieldType, label: 'Phone', icon: Phone, color: 'text-orange-400' },
    { type: 'number' as FormFieldType, label: 'Number', icon: Hash, color: 'text-indigo-400' },
    { type: 'currency' as FormFieldType, label: 'Currency', icon: DollarSign, color: 'text-green-400' },
    { type: 'percentage' as FormFieldType, label: 'Percentage', icon: Percent, color: 'text-lime-400' },
    { type: 'url' as FormFieldType, label: 'URL', icon: Globe, color: 'text-sky-400' },
    { type: 'password' as FormFieldType, label: 'Password', icon: Key, color: 'text-gray-400' }
  ];

  const handleFieldUpdate = (property: keyof FormField, value: any) => {
    if (selectedFieldId) {
      onFieldUpdate(selectedFieldId, { [property]: value });
    }
  };

  const handleStyleUpdate = (property: keyof FormField['style'], value: any) => {
    if (selectedFieldId && selectedField) {
      onFieldUpdate(selectedFieldId, {
        style: {
          ...selectedField.style,
          [property]: value
        }
      });
    }
  };

  return (
    <div className=\"space-y-6\">
      {/* Field Types */}
      <div className=\"bg-white/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-4\">
        <div className=\"flex items-center justify-between mb-4\">
          <h3 className=\"text-white font-semibold flex items-center gap-2\">
            <Square size={18} className=\"text-teal-400\" />
            Form Fields
          </h3>
          <button
            onClick={() => setShowFieldTypes(!showFieldTypes)}
            className={clsx(
              'p-2 rounded-lg transition-all duration-300',
              showFieldTypes ? 'bg-teal-500 text-white' : 'bg-white/10 hover:bg-white/20 text-gray-300'
            )}
          >
            <Plus size={16} />
          </button>
        </div>

        {showFieldTypes && (
          <div className=\"grid grid-cols-2 gap-2 mb-4\">
            {fieldTypes.map(({ type, label, icon: Icon, color }) => (
              <button
                key={type}
                onClick={() => {
                  onFieldAdd(type);
                  setShowFieldTypes(false);
                }}
                className=\"flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-300 hover:scale-105\"
              >
                <Icon size={16} className={color} />
                <span className=\"text-white text-sm font-medium\">{label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Field List */}
        <div className=\"space-y-2 max-h-40 overflow-y-auto\">
          {fields.map((field) => {
            const fieldType = fieldTypes.find(ft => ft.type === field.type);
            const Icon = fieldType?.icon || Square;
            
            return (
              <div
                key={field.id}
                onClick={() => onFieldSelect(field.id)}
                className={clsx(
                  'group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-300',
                  selectedFieldId === field.id
                    ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-teal-400/50'
                    : 'bg-white/5 hover:bg-white/10 border border-white/10'
                )}
              >
                <Icon size={16} className={fieldType?.color || 'text-gray-400'} />
                <div className=\"flex-1\">
                  <p className=\"text-white text-sm font-medium\">{field.label || `${field.type} field`}</p>
                  <p className=\"text-gray-400 text-xs\">
                    {field.width}×{field.height} at ({field.x}, {field.y})
                  </p>
                </div>
                <div className=\"flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity\">
                  {field.required && (
                    <div className=\"p-1 bg-red-500/20 rounded\">
                      <span className=\"text-red-400 text-xs\">*</span>
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFieldDelete(field.id);
                    }}
                    className=\"p-1 bg-red-500/20 hover:bg-red-500/30 rounded transition-colors\"
                  >
                    <Trash2 size={12} className=\"text-red-400\" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Field Properties */}
      {selectedField && (
        <div className=\"bg-white/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-4\">
          <h3 className=\"text-white font-semibold mb-4 flex items-center gap-2\">
            <Type size={18} className=\"text-cyan-400\" />
            Field Properties
          </h3>
          
          <div className=\"space-y-4\">
            {/* Basic Properties */}
            <div>
              <label className=\"text-sm text-gray-300 mb-2 block\">Label</label>
              <input
                type=\"text\"
                value={selectedField.label}
                onChange={(e) => handleFieldUpdate('label', e.target.value)}
                className=\"w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500\"
                placeholder=\"Field label\"
              />
            </div>
            
            <div>
              <label className=\"text-sm text-gray-300 mb-2 block\">Placeholder</label>
              <input
                type=\"text\"
                value={selectedField.placeholder || ''}
                onChange={(e) => handleFieldUpdate('placeholder', e.target.value)}
                className=\"w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500\"
                placeholder=\"Placeholder text\"
              />
            </div>
            
            <div className=\"flex items-center gap-2\">
              <input
                type=\"checkbox\"
                id=\"required\"
                checked={selectedField.required}
                onChange={(e) => handleFieldUpdate('required', e.target.checked)}
                className=\"w-4 h-4 bg-white/10 border border-white/20 rounded focus:ring-2 focus:ring-cyan-500\"
              />
              <label htmlFor=\"required\" className=\"text-sm text-gray-300\">
                Required field
              </label>
            </div>
            
            {/* Position & Size */}
            <div className=\"grid grid-cols-2 gap-3\">
              <div>
                <label className=\"text-sm text-gray-300 mb-1 block\">X Position</label>
                <input
                  type=\"number\"
                  value={selectedField.x}
                  onChange={(e) => handleFieldUpdate('x', parseInt(e.target.value))}
                  className=\"w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500\"
                />
              </div>
              <div>
                <label className=\"text-sm text-gray-300 mb-1 block\">Y Position</label>
                <input
                  type=\"number\"
                  value={selectedField.y}
                  onChange={(e) => handleFieldUpdate('y', parseInt(e.target.value))}
                  className=\"w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500\"
                />
              </div>
            </div>
            
            <div className=\"grid grid-cols-2 gap-3\">
              <div>
                <label className=\"text-sm text-gray-300 mb-1 block\">Width</label>
                <input
                  type=\"number\"
                  value={selectedField.width}
                  onChange={(e) => handleFieldUpdate('width', parseInt(e.target.value))}
                  className=\"w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500\"
                />
              </div>
              <div>
                <label className=\"text-sm text-gray-300 mb-1 block\">Height</label>
                <input
                  type=\"number\"
                  value={selectedField.height}
                  onChange={(e) => handleFieldUpdate('height', parseInt(e.target.value))}
                  className=\"w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500\"
                />
              </div>
            </div>
            
            {/* Options for dropdown/radio */}
            {(selectedField.type === 'dropdown' || selectedField.type === 'radio') && (
              <div>
                <label className=\"text-sm text-gray-300 mb-2 block\">Options (one per line)</label>
                <textarea
                  value={(selectedField.options || []).join('\
')}
                  onChange={(e) => handleFieldUpdate('options', e.target.value.split('\
').filter(o => o.trim()))}
                  className=\"w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500\"
                  rows={4}
                  placeholder=\"Option 1\
Option 2\
Option 3\"
                />
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Field Styling */}
      {selectedField && (
        <div className=\"bg-white/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-4\">
          <h3 className=\"text-white font-semibold mb-4 flex items-center gap-2\">
            <Eye size={18} className=\"text-pink-400\" />
            Appearance
          </h3>
          
          <div className=\"space-y-4\">
            {/* Font Size */}
            <div>
              <label className=\"text-sm text-gray-300 mb-2 block\">Font Size</label>
              <div className=\"flex items-center gap-2\">
                <input
                  type=\"range\"
                  min=\"8\"
                  max=\"24\"
                  value={selectedField.style.fontSize}
                  onChange={(e) => handleStyleUpdate('fontSize', parseInt(e.target.value))}
                  className=\"flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer\"
                />
                <span className=\"text-white font-medium min-w-[40px] text-center\">
                  {selectedField.style.fontSize}px
                </span>
              </div>
            </div>
            
            {/* Colors */}
            <div className=\"grid grid-cols-3 gap-3\">
              <div>
                <label className=\"text-sm text-gray-300 mb-1 block\">Text</label>
                <input
                  type=\"color\"
                  value={selectedField.style.color}
                  onChange={(e) => handleStyleUpdate('color', e.target.value)}
                  className=\"w-full h-10 bg-white/10 border border-white/20 rounded-lg cursor-pointer\"
                />
              </div>
              <div>
                <label className=\"text-sm text-gray-300 mb-1 block\">Background</label>
                <input
                  type=\"color\"
                  value={selectedField.style.backgroundColor}
                  onChange={(e) => handleStyleUpdate('backgroundColor', e.target.value)}
                  className=\"w-full h-10 bg-white/10 border border-white/20 rounded-lg cursor-pointer\"
                />
              </div>
              <div>
                <label className=\"text-sm text-gray-300 mb-1 block\">Border</label>
                <input
                  type=\"color\"
                  value={selectedField.style.borderColor}
                  onChange={(e) => handleStyleUpdate('borderColor', e.target.value)}
                  className=\"w-full h-10 bg-white/10 border border-white/20 rounded-lg cursor-pointer\"
                />
              </div>
            </div>
            
            {/* Border Width */}
            <div>
              <label className=\"text-sm text-gray-300 mb-2 block\">Border Width</label>
              <div className=\"flex items-center gap-2\">
                <input
                  type=\"range\"
                  min=\"0\"
                  max=\"5\"
                  value={selectedField.style.borderWidth}
                  onChange={(e) => handleStyleUpdate('borderWidth', parseInt(e.target.value))}
                  className=\"flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer\"
                />
                <span className=\"text-white font-medium min-w-[30px] text-center\">
                  {selectedField.style.borderWidth}px
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Field Validation */}
      {selectedField && ['text', 'textarea', 'email', 'url'].includes(selectedField.type) && (
        <div className=\"bg-white/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-4\">
          <h3 className=\"text-white font-semibold mb-4 flex items-center gap-2\">
            <Lock size={18} className=\"text-orange-400\" />
            Validation
          </h3>
          
          <div className=\"space-y-4\">
            <div className=\"grid grid-cols-2 gap-3\">
              <div>
                <label className=\"text-sm text-gray-300 mb-1 block\">Min Length</label>
                <input
                  type=\"number\"
                  value={selectedField.validation?.minLength || ''}
                  onChange={(e) => handleFieldUpdate('validation', {
                    ...selectedField.validation,
                    minLength: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  className=\"w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500\"
                />
              </div>
              <div>
                <label className=\"text-sm text-gray-300 mb-1 block\">Max Length</label>
                <input
                  type=\"number\"
                  value={selectedField.validation?.maxLength || ''}
                  onChange={(e) => handleFieldUpdate('validation', {
                    ...selectedField.validation,
                    maxLength: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  className=\"w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500\"
                />
              </div>
            </div>
            
            <div>
              <label className=\"text-sm text-gray-300 mb-2 block\">Regex Pattern</label>
              <input
                type=\"text\"
                value={selectedField.validation?.pattern || ''}
                onChange={(e) => handleFieldUpdate('validation', {
                  ...selectedField.validation,
                  pattern: e.target.value || undefined
                })}
                className=\"w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500\"
                placeholder=\"e.g., ^[A-Za-z0-9]+$\"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

