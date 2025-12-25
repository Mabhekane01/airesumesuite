import React, { useState, useRef } from 'react';
import { Button } from '../ui/Button';
import { 
  Image, Upload, Crop, RotateCw, FlipHorizontal, FlipVertical,
  Move, Maximize, Trash2, Copy, Eye, EyeOff, Layers, Palette
} from 'lucide-react';
import { clsx } from 'clsx';

interface ImageAnnotation {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
}

interface ImageEditorProps {
  images: ImageAnnotation[];
  onImageAdd: (image: File) => void;
  onImageUpdate: (id: string, updates: Partial<ImageAnnotation>) => void;
  onImageDelete: (id: string) => void;
  onImageSelect: (id: string) => void;
  selectedImageId?: string;
}

export default function ImageEditor({
  images,
  onImageAdd,
  onImageUpdate,
  onImageDelete,
  onImageSelect,
  selectedImageId
}: ImageEditorProps) {
  const [draggedImage, setDraggedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedImage = images.find(img => img.id === selectedImageId);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
          onImageAdd(file);
        }
      });
    }
  };

  const handleImageTransform = (property: keyof ImageAnnotation, value: any) => {
    if (selectedImageId) {
      onImageUpdate(selectedImageId, { [property]: value });
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-4">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Image size={18} className="text-teal-400" />
          Images
        </h3>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="w-full mb-4 border-dashed border-2 border-teal-400/50 hover:border-teal-400 hover:bg-blue-400/10"
        >
          <Upload size={16} />
          Upload Images
        </Button>
        
        {/* Image List */}
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {images.map((img) => (
            <div
              key={img.id}
              onClick={() => onImageSelect(img.id)}
              className={clsx(
                'group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-300',
                selectedImageId === img.id
                  ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-teal-400/50'
                  : 'bg-white/5 hover:bg-white/10 border border-white/10'
              )}
            >
              <div className="relative">
                <img
                  src={img.src}
                  alt="Annotation"
                  className="w-12 h-12 object-cover rounded-lg"
                />
                {!img.visible && (
                  <div className="absolute inset-0 bg-white/50 rounded-lg flex items-center justify-center">
                    <EyeOff size={12} className="text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Image {img.id}</p>
                <p className="text-gray-400 text-xs">
                  {img.width}x{img.height} • {img.opacity * 100}%
                </p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageUpdate(img.id, { visible: !img.visible });
                  }}
                  className="p-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
                >
                  {img.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageDelete(img.id);
                  }}
                  className="p-1 bg-red-500/20 hover:bg-red-500/30 rounded transition-colors"
                >
                  <Trash2 size={12} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Image Properties */}
      {selectedImage && (
        <div className="bg-white/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Layers size={18} className="text-cyan-400" />
            Transform
          </h3>
          
          {/* Transform Controls */}
          <div className="space-y-4">
            {/* Position */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-300 mb-1 block">X Position</label>
                <input
                  type="number"
                  value={selectedImage.x}
                  onChange={(e) => handleImageTransform('x', parseInt(e.target.value))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Y Position</label>
                <input
                  type="number"
                  value={selectedImage.y}
                  onChange={(e) => handleImageTransform('y', parseInt(e.target.value))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
            
            {/* Size */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Width</label>
                <input
                  type="number"
                  value={selectedImage.width}
                  onChange={(e) => handleImageTransform('width', parseInt(e.target.value))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Height</label>
                <input
                  type="number"
                  value={selectedImage.height}
                  onChange={(e) => handleImageTransform('height', parseInt(e.target.value))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
            
            {/* Rotation */}
            <div>
              <label className="text-sm text-gray-300 mb-2 block">Rotation</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={selectedImage.rotation}
                  onChange={(e) => handleImageTransform('rotation', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-white font-medium min-w-[50px] text-center">
                  {selectedImage.rotation}°
                </span>
              </div>
            </div>
            
            {/* Opacity */}
            <div>
              <label className="text-sm text-gray-300 mb-2 block">Opacity</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={selectedImage.opacity}
                  onChange={(e) => handleImageTransform('opacity', parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-white font-medium min-w-[50px] text-center">
                  {Math.round(selectedImage.opacity * 100)}%
                </span>
              </div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleImageTransform('rotation', selectedImage.rotation + 90)}
              >
                <RotateCw size={14} />
                Rotate 90°
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  // Flip horizontally by scaling x by -1
                  // This would need additional transform properties in the interface
                }}
              >
                <FlipHorizontal size={14} />
                Flip H
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  // Flip vertically by scaling y by -1
                  // This would need additional transform properties in the interface
                }}
              >
                <FlipVertical size={14} />
                Flip V
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  // Duplicate image
                  const newImage = {
                    ...selectedImage,
                    id: `${selectedImage.id}_copy`,
                    x: selectedImage.x + 20,
                    y: selectedImage.y + 20
                  };
                  // This would need to be handled by parent component
                }}
              >
                <Copy size={14} />
                Duplicate
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Image Filters */}
      {selectedImage && (
        <div className="bg-white/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Palette size={18} className="text-pink-400" />
            Filters & Effects
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            <Button size="sm" variant="outline" className="text-left">
              Grayscale
            </Button>
            <Button size="sm" variant="outline" className="text-left">
              Sepia
            </Button>
            <Button size="sm" variant="outline" className="text-left">
              Blur
            </Button>
            <Button size="sm" variant="outline" className="text-left">
              Brightness
            </Button>
            <Button size="sm" variant="outline" className="text-left">
              Contrast
            </Button>
            <Button size="sm" variant="outline" className="text-left">
              Invert
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}