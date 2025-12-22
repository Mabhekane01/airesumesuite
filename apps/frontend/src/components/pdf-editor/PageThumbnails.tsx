import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { 
  RotateCw, Trash2, Copy, Move, Eye, EyeOff, Lock, Unlock,
  ArrowUp, ArrowDown, Plus, Scissors, Grid
} from 'lucide-react';
import { clsx } from 'clsx';

interface Page {
  id: string;
  thumbnail: string;
  pageNumber: number;
  selected: boolean;
  locked: boolean;
  hidden: boolean;
}

interface PageThumbnailsProps {
  pages: Page[];
  onPageSelect: (pageId: string) => void;
  onPageDelete: (pageId: string) => void;
  onPageRotate: (pageId: string) => void;
  onPageDuplicate: (pageId: string) => void;
  onPageReorder: (fromIndex: number, toIndex: number) => void;
  onPageToggleVisibility: (pageId: string) => void;
  onPageToggleLock: (pageId: string) => void;
}

export default function PageThumbnails({
  pages,
  onPageSelect,
  onPageDelete,
  onPageRotate,
  onPageDuplicate,
  onPageReorder,
  onPageToggleVisibility,
  onPageToggleLock
}: PageThumbnailsProps) {
  const [draggedPage, setDraggedPage] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(false);

  const handleDragStart = (e: React.DragEvent, pageId: string) => {
    setDraggedPage(pageId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetPageId: string) => {
    e.preventDefault();
    if (!draggedPage) return;

    const fromIndex = pages.findIndex(p => p.id === draggedPage);
    const toIndex = pages.findIndex(p => p.id === targetPageId);
    
    if (fromIndex !== -1 && toIndex !== -1) {
      onPageReorder(fromIndex, toIndex);
    }
    
    setDraggedPage(null);
  };

  const selectedPages = pages.filter(p => p.selected);

  return (
    <div className="bg-white/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Grid size={18} className="text-cyan-400" />
            Pages ({pages.length})
          </h3>
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={clsx(
              'p-2 rounded-lg transition-all duration-300',
              showGrid ? 'bg-cyan-500 text-white' : 'bg-white/10 hover:bg-white/20 text-gray-300'
            )}
          >
            <Grid size={16} />
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedPages.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 rounded-lg border border-cyan-500/30">
            <span className="text-cyan-300 text-sm font-medium">
              {selectedPages.length} selected
            </span>
            <div className="flex gap-1 ml-auto">
              <Button size="sm" variant="ghost" onClick={() => selectedPages.forEach(p => onPageRotate(p.id))}>
                <RotateCw size={14} />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => selectedPages.forEach(p => onPageDuplicate(p.id))}>
                <Copy size={14} />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => selectedPages.forEach(p => onPageDelete(p.id))}>
                <Trash2 size={14} className="text-red-400" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Page Grid */}
      <div className={clsx(
        'p-4 max-h-96 overflow-y-auto',
        showGrid ? 'grid grid-cols-2 gap-4' : 'space-y-3'
      )}>
        {pages.map((page, index) => (
          <div
            key={page.id}
            draggable
            onDragStart={(e) => handleDragStart(e, page.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, page.id)}
            onClick={() => onPageSelect(page.id)}
            className={clsx(
              'group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 transform hover:scale-105',
              page.selected 
                ? 'ring-2 ring-cyan-400 shadow-lg shadow-cyan-400/25' 
                : 'hover:ring-2 hover:ring-white/30',
              draggedPage === page.id ? 'opacity-50 scale-95' : '',
              page.hidden ? 'opacity-50' : '',
              showGrid ? '' : 'flex items-center gap-3'
            )}
          >
            {/* Thumbnail */}
            <div className={clsx(
              'relative bg-white rounded-lg overflow-hidden',
              showGrid ? 'aspect-[3/4]' : 'w-16 h-20 flex-shrink-0'
            )}>
              <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <span className="text-gray-500 font-semibold text-lg">{page.pageNumber}</span>
              </div>
              
              {/* Page Status Icons */}
              <div className="absolute top-1 right-1 flex gap-1">
                {page.locked && (
                  <div className="p-1 bg-red-500 rounded-full">
                    <Lock size={10} className="text-white" />
                  </div>
                )}
                {page.hidden && (
                  <div className="p-1 bg-gray-500 rounded-full">
                    <EyeOff size={10} className="text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Page Info */}
            <div className={clsx('flex-1', showGrid ? 'p-2' : '')}>
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium">
                  Page {page.pageNumber}
                </span>
                {!showGrid && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPageToggleVisibility(page.id);
                      }}
                      className="p-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
                    >
                      {page.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPageToggleLock(page.id);
                      }}
                      className="p-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
                    >
                      {page.locked ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                  </div>
                )}
              </div>
              
              {showGrid && (
                <div className="flex justify-between items-center mt-2">
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPageRotate(page.id);
                      }}
                      className="p-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
                    >
                      <RotateCw size={12} className="text-gray-300" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPageDuplicate(page.id);
                      }}
                      className="p-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
                    >
                      <Copy size={12} className="text-gray-300" />
                    </button>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPageDelete(page.id);
                    }}
                    className="p-1 bg-red-500/20 hover:bg-red-500/30 rounded transition-colors"
                  >
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                </div>
              )}
            </div>

            {/* Drag Handle */}
            <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="p-1 bg-white/50 rounded-full">
                <Move size={12} className="text-white" />
              </div>
            </div>
          </div>
        ))}

        {/* Add Page Button */}
        <button className={clsx(
          'group border-2 border-dashed border-white/30 rounded-xl transition-all duration-300 hover:border-cyan-400 hover:bg-cyan-400/10',
          showGrid ? 'aspect-[3/4] flex items-center justify-center' : 'flex items-center gap-3 p-4'
        )}>
          <div className="flex items-center justify-center w-12 h-12 bg-white/10 rounded-lg group-hover:bg-cyan-400/20 transition-colors">
            <Plus size={20} className="text-gray-400 group-hover:text-cyan-400" />
          </div>
          {!showGrid && (
            <span className="text-gray-400 group-hover:text-cyan-400 font-medium">
              Add Page
            </span>
          )}
        </button>
      </div>

      {/* Reorder Controls */}
      {selectedPages.length === 1 && (
        <div className="p-3 border-t border-white/10 flex items-center justify-center gap-2">
          <Button size="sm" variant="ghost">
            <ArrowUp size={14} />
            Move Up
          </Button>
          <Button size="sm" variant="ghost">
            <ArrowDown size={14} />
            Move Down
          </Button>
        </div>
      )}
    </div>
  );
}
