import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { 
  Type, Palette, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline,
  Highlighter, Move, Square, Circle, Minus, MousePointer, Hand, Eraser,
  Plus, Minus as MinusIcon, RotateCw, FlipHorizontal, FlipVertical
} from 'lucide-react';
import { clsx } from 'clsx';

interface AdvancedToolbarProps {
  selectedTool: string;
  onToolSelect: (tool: string) => void;
  textStyle: {
    fontSize: number;
    fontFamily: string;
    color: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
  };
  onTextStyleChange: (style: any) => void;
}

const fonts = [
  'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana', 
  'Georgia', 'Comic Sans MS', 'Impact', 'Trebuchet MS', 'Palatino'
];

const colors = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
  '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000', '#000080'
];

export default function AdvancedToolbar({ 
  selectedTool, 
  onToolSelect, 
  textStyle, 
  onTextStyleChange 
}: AdvancedToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const tools = [
    { id: 'select', icon: MousePointer, label: 'Select', color: 'from-blue-500 to-indigo-600' },
    { id: 'text', icon: Type, label: 'Text', color: 'from-green-500 to-emerald-600' },
    { id: 'draw', icon: Highlighter, label: 'Draw', color: 'from-yellow-500 to-orange-600' },
    { id: 'shape', icon: Square, label: 'Shapes', color: 'from-emerald-500 to-violet-600' },
    { id: 'move', icon: Move, label: 'Move', color: 'from-pink-500 to-rose-600' },
    { id: 'erase', icon: Eraser, label: 'Erase', color: 'from-red-500 to-red-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Tool Selection */}
      <div className="bg-white/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-4">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <MousePointer size={18} className="text-cyan-400" />
          Tools
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {tools.map(({ id, icon: Icon, label, color }) => (
            <button
              key={id}
              onClick={() => onToolSelect(id)}
              className={clsx(
                'group flex items-center gap-2 p-3 rounded-xl transition-all duration-300 transform hover:scale-105',
                selectedTool === id
                  ? `bg-gradient-to-r ${color} text-white shadow-lg`
                  : 'text-gray-300 hover:text-white hover:bg-white/10 border border-white/10'
              )}
            >
              <Icon size={16} />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Text Styling */}
      {selectedTool === 'text' && (
        <div className="bg-white/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Type size={18} className="text-green-400" />
            Text Style
          </h3>
          
          {/* Font Family */}
          <div className="mb-4">
            <label className="text-sm text-gray-300 mb-2 block">Font Family</label>
            <select
              value={textStyle.fontFamily}
              onChange={(e) => onTextStyleChange({ ...textStyle, fontFamily: e.target.value })}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {fonts.map(font => (
                <option key={font} value={font} className="bg-surface-50">{font}</option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div className="mb-4">
            <label className="text-sm text-gray-300 mb-2 block">Font Size</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onTextStyleChange({ ...textStyle, fontSize: Math.max(8, textStyle.fontSize - 1) })}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <MinusIcon size={14} className="text-white" />
              </button>
              <span className="text-white font-medium min-w-[40px] text-center">{textStyle.fontSize}px</span>
              <button
                onClick={() => onTextStyleChange({ ...textStyle, fontSize: Math.min(72, textStyle.fontSize + 1) })}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <Plus size={14} className="text-white" />
              </button>
            </div>
          </div>

          {/* Text Formatting */}
          <div className="mb-4">
            <label className="text-sm text-gray-300 mb-2 block">Formatting</label>
            <div className="flex gap-2">
              <button
                onClick={() => onTextStyleChange({ ...textStyle, bold: !textStyle.bold })}
                className={clsx(
                  'p-2 rounded-lg transition-all duration-300',
                  textStyle.bold ? 'bg-teal-500 text-white' : 'bg-white/10 hover:bg-white/20 text-gray-300'
                )}
              >
                <Bold size={16} />
              </button>
              <button
                onClick={() => onTextStyleChange({ ...textStyle, italic: !textStyle.italic })}
                className={clsx(
                  'p-2 rounded-lg transition-all duration-300',
                  textStyle.italic ? 'bg-teal-500 text-white' : 'bg-white/10 hover:bg-white/20 text-gray-300'
                )}
              >
                <Italic size={16} />
              </button>
              <button
                onClick={() => onTextStyleChange({ ...textStyle, underline: !textStyle.underline })}
                className={clsx(
                  'p-2 rounded-lg transition-all duration-300',
                  textStyle.underline ? 'bg-teal-500 text-white' : 'bg-white/10 hover:bg-white/20 text-gray-300'
                )}
              >
                <Underline size={16} />
              </button>
            </div>
          </div>

          {/* Color Picker */}
          <div className="mb-4">
            <label className="text-sm text-gray-300 mb-2 block">Text Color</label>
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="flex items-center gap-2 w-full p-3 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
              >
                <div 
                  className="w-6 h-6 rounded border-2 border-white/30"
                  style={{ backgroundColor: textStyle.color }}
                />
                <Palette size={16} className="text-gray-300" />
                <span className="text-white">{textStyle.color}</span>
              </button>
              
              {showColorPicker && (
                <div className="absolute top-full left-0 mt-2 p-3 bg-white/90 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl z-50">
                  <div className="grid grid-cols-4 gap-2">
                    {colors.map(color => (
                      <button
                        key={color}
                        onClick={() => {
                          onTextStyleChange({ ...textStyle, color });
                          setShowColorPicker(false);
                        }}
                        className={clsx(
                          'w-8 h-8 rounded border-2 transition-transform hover:scale-110',
                          textStyle.color === color ? 'border-white' : 'border-gray-600'
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Text Alignment */}
          <div>
            <label className="text-sm text-gray-300 mb-2 block">Alignment</label>
            <div className="flex gap-2">
              <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                <AlignLeft size={16} className="text-gray-300" />
              </button>
              <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                <AlignCenter size={16} className="text-gray-300" />
              </button>
              <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                <AlignRight size={16} className="text-gray-300" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shape Tools */}
      {selectedTool === 'shape' && (
        <div className="bg-white/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Square size={18} className="text-emerald-400" />
            Shapes
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button className="p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-gray-300 flex items-center gap-2">
              <Square size={16} />
              <span className="text-sm">Rectangle</span>
            </button>
            <button className="p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-gray-300 flex items-center gap-2">
              <Circle size={16} />
              <span className="text-sm">Circle</span>
            </button>
            <button className="p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-gray-300 flex items-center gap-2">
              <Minus size={16} />
              <span className="text-sm">Line</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
