import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { 
  Droplets, Type, Image, Stamp, RotateCw, Move, Eye, EyeOff,
  Plus, Trash2, Copy, Download, Upload, Palette, Layers
} from 'lucide-react';
import { clsx } from 'clsx';

type WatermarkType = 'text' | 'image' | 'stamp';

interface Watermark {
  id: string;
  type: WatermarkType;
  content: string; // text content or image URL
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  style: {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    backgroundColor?: string;
    borderWidth?: number;
    borderColor?: string;
  };
}

interface WatermarkEditorProps {
  watermarks: Watermark[];
  selectedWatermarkId?: string;
  onWatermarkAdd: (type: WatermarkType) => void;
  onWatermarkUpdate: (id: string, updates: Partial<Watermark>) => void;
  onWatermarkDelete: (id: string) => void;
  onWatermarkSelect: (id: string) => void;
  onWatermarkApplyToAll: (id: string) => void;
}

export default function WatermarkEditor({
  watermarks,
  selectedWatermarkId,
  onWatermarkAdd,
  onWatermarkUpdate,
  onWatermarkDelete,
  onWatermarkSelect,
  onWatermarkApplyToAll
}: WatermarkEditorProps) {
  const [presetWatermarks] = useState([
    { id: 'confidential', text: 'CONFIDENTIAL', color: '#ff0000' },
    { id: 'draft', text: 'DRAFT', color: '#ffa500' },
    { id: 'sample', text: 'SAMPLE', color: '#0066cc' },
    { id: 'copy', text: 'COPY', color: '#666666' },
    { id: 'approved', text: 'APPROVED', color: '#008000' },
    { id: 'void', text: 'VOID', color: '#ff0000' },
    { id: 'original', text: 'ORIGINAL', color: '#000080' },
    { id: 'duplicate', text: 'DUPLICATE', color: '#800080' }
  ]);
  
  const selectedWatermark = watermarks.find(w => w.id === selectedWatermarkId);
  
  const handleWatermarkUpdate = (property: keyof Watermark, value: any) => {
    if (selectedWatermarkId) {
      onWatermarkUpdate(selectedWatermarkId, { [property]: value });
    }
  };
  
  const handleStyleUpdate = (property: keyof Watermark['style'], value: any) => {
    if (selectedWatermarkId && selectedWatermark) {
      onWatermarkUpdate(selectedWatermarkId, {
        style: {
          ...selectedWatermark.style,
          [property]: value
        }
      });
    }
  };

  return (
    <div className=\"space-y-6\">
      {/* Quick Presets */}
      <div className=\"bg-white/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-4\">
        <h3 className=\"text-white font-semibold mb-4 flex items-center gap-2\">
          <Stamp size={18} className=\"text-teal-400\" />
          Quick Watermarks
        </h3>
        
        <div className=\"grid grid-cols-2 gap-2 mb-4\">
          {presetWatermarks.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                onWatermarkAdd('text');
                // After adding, update with preset values
                setTimeout(() => {
                  const newWatermark = watermarks[watermarks.length - 1];
                  if (newWatermark) {
                    onWatermarkUpdate(newWatermark.id, {
                      content: preset.text,
                      style: { ...newWatermark.style, color: preset.color }
                    });
                  }
                }, 100);
              }}
              className=\"p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-300 hover:scale-105 border border-white/10 hover:border-white/20\"
            >
              <span 
                className=\"text-sm font-bold\" 
                style={{ color: preset.color }}
              >
                {preset.text}
              </span>
            </button>
          ))}
        </div>
        
        <div className=\"flex gap-2\">
          <Button
            onClick={() => onWatermarkAdd('text')}
            variant=\"outline\"
            size=\"sm\"
            className=\"flex-1\"
          >
            <Type size={14} />
            Text Watermark
          </Button>
          <Button
            onClick={() => onWatermarkAdd('image')}
            variant=\"outline\"
            size=\"sm\"
            className=\"flex-1\"
          >
            <Image size={14} />
            Image Watermark
          </Button>
        </div>
      </div>

      {/* Watermark List */}
      <div className=\"bg-white/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-4\">
        <h3 className=\"text-white font-semibold mb-4 flex items-center gap-2\">
          <Layers size={18} className=\"text-cyan-400\" />
          Watermarks ({watermarks.length})
        </h3>
        
        <div className=\"space-y-2 max-h-40 overflow-y-auto\">
          {watermarks.map((watermark, index) => (
            <div
              key={watermark.id}
              onClick={() => onWatermarkSelect(watermark.id)}
              className={clsx(
                'group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-300',
                selectedWatermarkId === watermark.id
                  ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-teal-400/50'
                  : 'bg-white/5 hover:bg-white/10 border border-white/10'
              )}
            >
              <div className={clsx(
                'w-10 h-10 rounded-lg flex items-center justify-center border border-white/20',
                watermark.type === 'text' ? 'bg-teal-500/20' :
                watermark.type === 'image' ? 'bg-green-500/20' : 'bg-emerald-500/20'
              )}>
                {watermark.type === 'text' && <Type size={16} className=\"text-teal-400\" />}
                {watermark.type === 'image' && <Image size={16} className=\"text-green-400\" />}
                {watermark.type === 'stamp' && <Stamp size={16} className=\"text-emerald-400\" />}
              </div>
              
              <div className=\"flex-1\">
                <p className=\"text-white text-sm font-medium\">
                  {watermark.content.length > 20 
                    ? `${watermark.content.substring(0, 20)}...` 
                    : watermark.content}
                </p>
                <p className=\"text-gray-400 text-xs\">
                  Layer {index + 1} • {Math.round(watermark.opacity * 100)}% opacity
                </p>
              </div>
              
              <div className=\"flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity\">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onWatermarkUpdate(watermark.id, { visible: !watermark.visible });
                  }}
                  className={clsx(
                    'p-1 rounded transition-colors',
                    watermark.visible 
                      ? 'bg-white/10 hover:bg-white/20' 
                      : 'bg-gray-500/20 hover:bg-gray-500/30'
                  )}
                >
                  {watermark.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onWatermarkApplyToAll(watermark.id);
                  }}
                  className=\"p-1 bg-green-500/20 hover:bg-green-500/30 rounded transition-colors\"
                  title=\"Apply to all pages\"
                >
                  <Copy size={12} className=\"text-green-400\" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onWatermarkDelete(watermark.id);
                  }}
                  className=\"p-1 bg-red-500/20 hover:bg-red-500/30 rounded transition-colors\"
                >
                  <Trash2 size={12} className=\"text-red-400\" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Watermark Properties */}
      {selectedWatermark && (
        <div className=\"bg-white/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-4\">
          <h3 className=\"text-white font-semibold mb-4 flex items-center gap-2\">
            <Droplets size={18} className=\"text-pink-400\" />
            Watermark Properties
          </h3>
          
          <div className=\"space-y-4\">
            {/* Content */}
            <div>
              <label className=\"text-sm text-gray-300 mb-2 block\">
                {selectedWatermark.type === 'text' ? 'Text Content' : 'Image URL'}
              </label>
              {selectedWatermark.type === 'text' ? (
                <textarea
                  value={selectedWatermark.content}
                  onChange={(e) => handleWatermarkUpdate('content', e.target.value)}
                  className=\"w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500\"
                  rows={3}
                  placeholder=\"Enter watermark text\"
                />
              ) : (
                <div className=\"space-y-2\">
                  <input
                    type=\"url\"
                    value={selectedWatermark.content}
                    onChange={(e) => handleWatermarkUpdate('content', e.target.value)}
                    className=\"w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500\"
                    placeholder=\"Image URL or upload\"
                  />
                  <Button size=\"sm\" variant=\"outline\" className=\"w-full\">
                    <Upload size={14} />
                    Upload Image
                  </Button>
                </div>
              )}
            </div>
            
            {/* Position & Size */}
            <div className=\"grid grid-cols-2 gap-3\">
              <div>
                <label className=\"text-sm text-gray-300 mb-1 block\">X Position</label>
                <input
                  type=\"number\"
                  value={selectedWatermark.x}
                  onChange={(e) => handleWatermarkUpdate('x', parseInt(e.target.value))}
                  className=\"w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500\"
                />
              </div>
              <div>
                <label className=\"text-sm text-gray-300 mb-1 block\">Y Position</label>
                <input
                  type=\"number\"
                  value={selectedWatermark.y}
                  onChange={(e) => handleWatermarkUpdate('y', parseInt(e.target.value))}
                  className=\"w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500\"
                />
              </div>
            </div>
            
            <div className=\"grid grid-cols-2 gap-3\">
              <div>
                <label className=\"text-sm text-gray-300 mb-1 block\">Width</label>
                <input
                  type=\"number\"
                  value={selectedWatermark.width}
                  onChange={(e) => handleWatermarkUpdate('width', parseInt(e.target.value))}
                  className=\"w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500\"
                />
              </div>
              <div>
                <label className=\"text-sm text-gray-300 mb-1 block\">Height</label>
                <input
                  type=\"number\"
                  value={selectedWatermark.height}
                  onChange={(e) => handleWatermarkUpdate('height', parseInt(e.target.value))}
                  className=\"w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500\"
                />
              </div>
            </div>
            
            {/* Rotation */}
            <div>
              <label className=\"text-sm text-gray-300 mb-2 block\">Rotation</label>
              <div className=\"flex items-center gap-2\">
                <input
                  type=\"range\"
                  min=\"-180\"
                  max=\"180\"
                  value={selectedWatermark.rotation}
                  onChange={(e) => handleWatermarkUpdate('rotation', parseInt(e.target.value))}
                  className=\"flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer\"
                />
                <span className=\"text-white font-medium min-w-[60px] text-center\">
                  {selectedWatermark.rotation}°
                </span>
                <button
                  onClick={() => handleWatermarkUpdate('rotation', selectedWatermark.rotation + 45)}
                  className=\"p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors\"
                >
                  <RotateCw size={14} className=\"text-gray-300\" />
                </button>
              </div>
            </div>
            
            {/* Opacity */}
            <div>
              <label className=\"text-sm text-gray-300 mb-2 block\">Opacity</label>
              <div className=\"flex items-center gap-2\">
                <input
                  type=\"range\"
                  min=\"0\"
                  max=\"1\"
                  step=\"0.1\"
                  value={selectedWatermark.opacity}
                  onChange={(e) => handleWatermarkUpdate('opacity', parseFloat(e.target.value))}
                  className=\"flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer\"
                />
                <span className=\"text-white font-medium min-w-[50px] text-center\">
                  {Math.round(selectedWatermark.opacity * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Text Styling */}
      {selectedWatermark && selectedWatermark.type === 'text' && (
        <div className=\"bg-white/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-4\">
          <h3 className=\"text-white font-semibold mb-4 flex items-center gap-2\">
            <Palette size={18} className=\"text-yellow-400\" />
            Text Styling
          </h3>
          
          <div className=\"space-y-4\">
            {/* Font Size */}
            <div>
              <label className=\"text-sm text-gray-300 mb-2 block\">Font Size</label>
              <div className=\"flex items-center gap-2\">
                <input
                  type=\"range\"
                  min=\"8\"
                  max=\"72\"
                  value={selectedWatermark.style.fontSize || 16}
                  onChange={(e) => handleStyleUpdate('fontSize', parseInt(e.target.value))}
                  className=\"flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer\"
                />
                <span className=\"text-white font-medium min-w-[40px] text-center\">
                  {selectedWatermark.style.fontSize || 16}px
                </span>
              </div>
            </div>
            
            {/* Font Family */}
            <div>
              <label className=\"text-sm text-gray-300 mb-2 block\">Font Family</label>
              <select
                value={selectedWatermark.style.fontFamily || 'Arial'}
                onChange={(e) => handleStyleUpdate('fontFamily', e.target.value)}
                className=\"w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500\"
              >
                <option value=\"Arial\">Arial</option>
                <option value=\"Helvetica\">Helvetica</option>
                <option value=\"Times New Roman\">Times New Roman</option>
                <option value=\"Courier New\">Courier New</option>
                <option value=\"Impact\">Impact</option>
                <option value=\"Georgia\">Georgia</option>
              </select>
            </div>
            
            {/* Colors */}
            <div className=\"grid grid-cols-2 gap-3\">
              <div>
                <label className=\"text-sm text-gray-300 mb-1 block\">Text Color</label>
                <input
                  type=\"color\"
                  value={selectedWatermark.style.color || '#000000'}
                  onChange={(e) => handleStyleUpdate('color', e.target.value)}
                  className=\"w-full h-10 bg-white/10 border border-white/20 rounded-lg cursor-pointer\"
                />
              </div>
              <div>
                <label className=\"text-sm text-gray-300 mb-1 block\">Background</label>
                <input
                  type=\"color\"
                  value={selectedWatermark.style.backgroundColor || '#ffffff'}
                  onChange={(e) => handleStyleUpdate('backgroundColor', e.target.value)}
                  className=\"w-full h-10 bg-white/10 border border-white/20 rounded-lg cursor-pointer\"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Quick Actions */}
      {selectedWatermark && (
        <div className=\"bg-white/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-4\">
          <h3 className=\"text-white font-semibold mb-4 flex items-center gap-2\">
            <Move size={18} className=\"text-green-400\" />
            Quick Actions
          </h3>
          
          <div className=\"grid grid-cols-2 gap-3\">
            <Button
              size=\"sm\"
              variant=\"outline\"
              onClick={() => {
                handleWatermarkUpdate('x', 50);
                handleWatermarkUpdate('y', 50);
              }}
            >
              Center Top
            </Button>
            <Button
              size=\"sm\"
              variant=\"outline\"
              onClick={() => {
                handleWatermarkUpdate('x', 50);
                handleWatermarkUpdate('y', 50);
                handleWatermarkUpdate('rotation', 45);
              }}
            >
              Diagonal
            </Button>
            <Button
              size=\"sm\"
              variant=\"outline\"
              onClick={() => handleWatermarkUpdate('opacity', 0.3)}
            >
              Light (30%)
            </Button>
            <Button
              size=\"sm\"
              variant=\"outline\"
              onClick={() => onWatermarkApplyToAll(selectedWatermark.id)}
            >
              Apply to All
            </Button>
          </div>
          
          {/* Position Presets */}
          <div className=\"mt-4\">
            <label className=\"text-sm text-gray-300 mb-2 block\">Position Presets</label>
            <div className=\"grid grid-cols-3 gap-2\">
              <Button
                size=\"sm\"
                variant=\"outline\"
                onClick={() => {
                  handleWatermarkUpdate('x', 20);
                  handleWatermarkUpdate('y', 80);
                }}
              >
                Top Left
              </Button>
              <Button
                size=\"sm\"
                variant=\"outline\"
                onClick={() => {
                  handleWatermarkUpdate('x', 50);
                  handleWatermarkUpdate('y', 80);
                }}
              >
                Top Center
              </Button>
              <Button
                size=\"sm\"
                variant=\"outline\"
                onClick={() => {
                  handleWatermarkUpdate('x', 80);
                  handleWatermarkUpdate('y', 80);
                }}
              >
                Top Right
              </Button>
              <Button
                size=\"sm\"
                variant=\"outline\"
                onClick={() => {
                  handleWatermarkUpdate('x', 50);
                  handleWatermarkUpdate('y', 50);
                }}
              >
                Center
              </Button>
              <Button
                size=\"sm\"
                variant=\"outline\"
                onClick={() => {
                  handleWatermarkUpdate('x', 20);
                  handleWatermarkUpdate('y', 20);
                }}
              >
                Bottom Left
              </Button>
              <Button
                size=\"sm\"
                variant=\"outline\"
                onClick={() => {
                  handleWatermarkUpdate('x', 80);
                  handleWatermarkUpdate('y', 20);
                }}
              >
                Bottom Right
              </Button>
          </div>
        </div>
      )}
    </div>
  );
}

