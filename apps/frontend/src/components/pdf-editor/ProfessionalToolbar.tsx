import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { 
  Type, Bold, Italic, Underline, Strikethrough, Subscript, Superscript,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Indent, Outdent, Quote,
  Palette, Brush, Highlighter, Eraser,
  Minus, Plus, RotateCw,
  Copy, Scissors, Clipboard, Undo, Redo, Search, Replace,
  ChevronDown, Settings, Layers, Grid, Ruler, ZoomIn, ZoomOut,
  PaintBucket, Pipette, Spline, Square, Circle, Triangle, Pen,
  Save, FileDown, FileUp, Share2, Printer, Eye
} from 'lucide-react';
import { clsx } from 'clsx';

interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  fontStyle: 'normal' | 'italic' | 'oblique';
  textDecoration: string[];
  color: string;
  backgroundColor: string;
  lineHeight: number;
  letterSpacing: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

interface ProfessionalToolbarProps {
  selectedElements: any[];
  currentStyle: TextStyle;
  onStyleChange: (style: Partial<TextStyle>) => void;
  onAction: (action: string, params?: any) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  showGrid: boolean;
  onToggleGrid: () => void;
  showRulers: boolean;
  onToggleRulers: () => void;
}

export default function ProfessionalToolbar({
  selectedElements,
  currentStyle,
  onStyleChange,
  onAction,
  zoom,
  onZoomChange,
  canUndo,
  canRedo,
  showGrid,
  onToggleGrid,
  showRulers,
  onToggleRulers
}: ProfessionalToolbarProps) {
  const [activePanel, setActivePanel] = useState<'text' | 'format' | 'color' | 'paragraph' | 'tools' | null>(null);
  const [colorPickerType, setColorPickerType] = useState<'text' | 'background' | 'highlight'>('text');
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [recentFonts, setRecentFonts] = useState<string[]>(['Arial', 'Times New Roman', 'Helvetica']);

  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Standard font families
  const fontFamilies = [
    'Arial', 'Times New Roman', 'Helvetica', 'Georgia', 'Verdana',
    'Courier New', 'Trebuchet MS', 'Impact', 'Comic Sans MS', 'Palatino',
    'Garamond', 'Bookman', 'Avant Garde', 'Century Gothic', 'Franklin Gothic'
  ];

  // Font sizes
  const fontSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

  // Predefined colors
  const standardColors = [
    '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
    '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
    '#800000', '#008000', '#000080', '#808000', '#800080', '#008080',
    '#FFA500', '#FFC0CB', '#A0522D', '#90EE90', '#87CEEB', '#DDA0DD'
  ];

  const highlightColors = [
    '#FFFF00', '#00FF00', '#00FFFF', '#FF00FF', '#FFA500', '#FFC0CB',
    '#90EE90', '#87CEEB', '#DDA0DD', '#F0E68C', '#FFB6C1', '#E0E0E0'
  ];

  // Handle text decoration
  const toggleTextDecoration = (decoration: string) => {
    const currentDecorations = currentStyle.textDecoration || [];
    const newDecorations = currentDecorations.includes(decoration)
      ? currentDecorations.filter(d => d !== decoration)
      : [...currentDecorations, decoration];
    
    onStyleChange({ textDecoration: newDecorations });
  };

  const hasTextDecoration = (decoration: string) => {
    return currentStyle.textDecoration?.includes(decoration) || false;
  };

  // Handle font selection
  const handleFontChange = (fontFamily: string) => {
    onStyleChange({ fontFamily });
    
    // Update recent fonts
    const newRecentFonts = [fontFamily, ...recentFonts.filter(f => f !== fontFamily)].slice(0, 5);
    setRecentFonts(newRecentFonts);
  };

  // Handle color changes
  const handleColorChange = (color: string, type: 'text' | 'background' | 'highlight') => {
    switch (type) {
      case 'text':
        onStyleChange({ color });
        break;
      case 'background':
        onStyleChange({ backgroundColor: color });
        break;
      case 'highlight':
        onAction('highlight', { color });
        break;
    }
    
    // Add to custom colors if not already present
    if (!standardColors.includes(color) && !customColors.includes(color)) {
      setCustomColors(prev => [color, ...prev].slice(0, 10));
    }
  };

  // Render color picker
  const renderColorPicker = (type: 'text' | 'background' | 'highlight') => {
    const colors = type === 'highlight' ? highlightColors : standardColors;
    
    return (
      <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-lg">
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            {type === 'text' ? 'Text Color' : type === 'background' ? 'Background Color' : 'Highlight Color'}
          </h4>
          <div className="grid grid-cols-6 gap-1 mb-2">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => handleColorChange(color, type)}
                className="w-8 h-8 rounded border border-gray-300 hover:border-gray-500 transition-colors"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          
          {customColors.length > 0 && (
            <>
              <h5 className="text-xs font-medium text-gray-600 mb-1">Recent Colors</h5>
              <div className="flex gap-1 mb-2">
                {customColors.map(color => (
                  <button
                    key={color}
                    onClick={() => handleColorChange(color, type)}
                    className="w-6 h-6 rounded border border-gray-300 hover:border-gray-500"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </>
          )}
          
          <div className="flex items-center gap-2">
            <input
              type="color"
              onChange={(e) => handleColorChange(e.target.value, type)}
              className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
            />
            <span className="text-xs text-gray-600">Custom</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      {/* Main Toolbar */}
      <div className="flex items-center justify-between p-2 space-x-1">
        
        {/* File Operations */}
        <div className="flex items-center space-x-1">
          <Button size="sm" variant="ghost" onClick={() => onAction('save')}>
            <Save size={16} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAction('export')}>
            <FileDown size={16} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAction('print')}>
            <Printer size={16} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAction('share')}>
            <Share2 size={16} />
          </Button>
        </div>

        {/* Edit Operations */}
        <div className="flex items-center space-x-1">
          <Button size="sm" variant="ghost" onClick={() => onAction('undo')} disabled={!canUndo}>
            <Undo size={16} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAction('redo')} disabled={!canRedo}>
            <Redo size={16} />
          </Button>
          <div className="w-px h-6 bg-gray-300 mx-2" />
          <Button size="sm" variant="ghost" onClick={() => onAction('cut')}>
            <Scissors size={16} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAction('copy')}>
            <Copy size={16} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAction('paste')}>
            <Clipboard size={16} />
          </Button>
        </div>

        {/* Font Selection */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <select
              value={currentStyle.fontFamily}
              onChange={(e) => handleFontChange(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded px-3 py-1 pr-8 text-sm focus:outline-none focus:border-blue-500"
            >
              <optgroup label="Recent">
                {recentFonts.map(font => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </optgroup>
              <optgroup label="All Fonts">
                {fontFamilies.filter(f => !recentFonts.includes(f)).map(font => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </optgroup>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>

          <div className="relative">
            <select
              value={currentStyle.fontSize}
              onChange={(e) => onStyleChange({ fontSize: parseInt(e.target.value) })}
              className="appearance-none bg-white border border-gray-300 rounded px-2 py-1 pr-6 text-sm focus:outline-none focus:border-blue-500"
            >
              {fontSizes.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Text Formatting */}
        <div className="flex items-center space-x-1">
          <Button
            size="sm"
            variant={currentStyle.fontWeight === 'bold' ? 'primary' : 'ghost'}
            onClick={() => onStyleChange({ fontWeight: currentStyle.fontWeight === 'bold' ? 'normal' : 'bold' })}
          >
            <Bold size={16} />
          </Button>
          <Button
            size="sm"
            variant={currentStyle.fontStyle === 'italic' ? 'primary' : 'ghost'}
            onClick={() => onStyleChange({ fontStyle: currentStyle.fontStyle === 'italic' ? 'normal' : 'italic' })}
          >
            <Italic size={16} />
          </Button>
          <Button
            size="sm"
            variant={hasTextDecoration('underline') ? 'primary' : 'ghost'}
            onClick={() => toggleTextDecoration('underline')}
          >
            <Underline size={16} />
          </Button>
          <Button
            size="sm"
            variant={hasTextDecoration('line-through') ? 'primary' : 'ghost'}
            onClick={() => toggleTextDecoration('line-through')}
          >
            <Strikethrough size={16} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAction('subscript')}>
            <Subscript size={16} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAction('superscript')}>
            <Superscript size={16} />
          </Button>
        </div>

        {/* Text Alignment */}
        <div className="flex items-center space-x-1">
          <Button
            size="sm"
            variant={currentStyle.textAlign === 'left' ? 'primary' : 'ghost'}
            onClick={() => onStyleChange({ textAlign: 'left' })}
          >
            <AlignLeft size={16} />
          </Button>
          <Button
            size="sm"
            variant={currentStyle.textAlign === 'center' ? 'primary' : 'ghost'}
            onClick={() => onStyleChange({ textAlign: 'center' })}
          >
            <AlignCenter size={16} />
          </Button>
          <Button
            size="sm"
            variant={currentStyle.textAlign === 'right' ? 'primary' : 'ghost'}
            onClick={() => onStyleChange({ textAlign: 'right' })}
          >
            <AlignRight size={16} />
          </Button>
          <Button
            size="sm"
            variant={currentStyle.textAlign === 'justify' ? 'primary' : 'ghost'}
            onClick={() => onStyleChange({ textAlign: 'justify' })}
          >
            <AlignJustify size={16} />
          </Button>
        </div>

        {/* Colors and Highlighting */}
        <div className="flex items-center space-x-1">
          <div className="relative">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setActivePanel(activePanel === 'color' ? null : 'color')}
              className="relative"
            >
              <Palette size={16} />
              <div 
                className="absolute bottom-0 right-0 w-3 h-3 border border-white rounded-sm"
                style={{ backgroundColor: currentStyle.color }}
              />
            </Button>
            {activePanel === 'color' && (
              <div className="absolute top-full left-0 z-50 mt-1">
                {renderColorPicker('text')}
              </div>
            )}
          </div>

          <div className="relative">
            <Button size="sm" variant="ghost" onClick={() => onAction('highlight')}>
              <Highlighter size={16} />
            </Button>
          </div>

          <Button size="sm" variant="ghost" onClick={() => onAction('fill')}>
            <PaintBucket size={16} />
          </Button>
        </div>

        {/* Lists and Indentation */}
        <div className="flex items-center space-x-1">
          <Button size="sm" variant="ghost" onClick={() => onAction('bulletList')}>
            <List size={16} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAction('numberedList')}>
            <ListOrdered size={16} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAction('outdent')}>
            <Outdent size={16} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAction('indent')}>
            <Indent size={16} />
          </Button>
        </div>

        {/* View Controls */}
        <div className="flex items-center space-x-1">
          <Button
            size="sm"
            variant={showGrid ? 'primary' : 'ghost'}
            onClick={onToggleGrid}
          >
            <Grid size={16} />
          </Button>
          <Button
            size="sm"
            variant={showRulers ? 'primary' : 'ghost'}
            onClick={onToggleRulers}
          >
            <Ruler size={16} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onZoomChange(zoom - 0.25)}>
            <ZoomOut size={16} />
          </Button>
          <span className="text-sm font-medium min-w-[50px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button size="sm" variant="ghost" onClick={() => onZoomChange(zoom + 0.25)}>
            <ZoomIn size={16} />
          </Button>
        </div>

        {/* Advanced Tools */}
        <div className="flex items-center space-x-1">
          <Button size="sm" variant="ghost" onClick={() => onAction('search')}>
            <Search size={16} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAction('replace')}>
            <Replace size={16} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setActivePanel('tools')}>
            <Settings size={16} />
          </Button>
        </div>
      </div>

      {/* Advanced Formatting Panel */}
      {activePanel === 'format' && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Line Height</label>
              <input
                type="range"
                min="0.8"
                max="3"
                step="0.1"
                value={currentStyle.lineHeight}
                onChange={(e) => onStyleChange({ lineHeight: parseFloat(e.target.value) })}
                className="w-full"
              />
              <span className="text-xs text-gray-500">{currentStyle.lineHeight}</span>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Letter Spacing</label>
              <input
                type="range"
                min="-0.1"
                max="0.5"
                step="0.01"
                value={currentStyle.letterSpacing}
                onChange={(e) => onStyleChange({ letterSpacing: parseFloat(e.target.value) })}
                className="w-full"
              />
              <span className="text-xs text-gray-500">{currentStyle.letterSpacing}em</span>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Text Transform</label>
              <select
                value={currentStyle.textTransform}
                onChange={(e) => onStyleChange({ textTransform: e.target.value as any })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="none">None</option>
                <option value="uppercase">UPPERCASE</option>
                <option value="lowercase">lowercase</option>
                <option value="capitalize">Capitalize</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Font Weight</label>
              <select
                value={currentStyle.fontWeight}
                onChange={(e) => onStyleChange({ fontWeight: e.target.value as any })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="100">Thin (100)</option>
                <option value="200">Extra Light (200)</option>
                <option value="300">Light (300)</option>
                <option value="400">Normal (400)</option>
                <option value="500">Medium (500)</option>
                <option value="600">Semi Bold (600)</option>
                <option value="700">Bold (700)</option>
                <option value="800">Extra Bold (800)</option>
                <option value="900">Black (900)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="border-t border-gray-200 px-4 py-1 text-xs text-gray-600 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {selectedElements.length > 0 && (
            <span>{selectedElements.length} element{selectedElements.length !== 1 ? 's' : ''} selected</span>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <span>Ready</span>
        </div>
      </div>
    </div>
  );
}
