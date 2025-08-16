import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { 
  Move, RotateCw, Square, Circle, Type, Image, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, 
  Maximize2, Minimize2, Lock, Unlock, Eye, EyeOff
} from 'lucide-react';
import { clsx } from 'clsx';

interface DraggableElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'annotation' | 'form';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  zIndex: number;
  isLocked: boolean;
  isVisible: boolean;
  isSelected: boolean;
  data: any; // Element-specific data
}

interface SelectionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface DragDropSystemProps {
  elements: DraggableElement[];
  onElementsChange: (elements: DraggableElement[]) => void;
  pageWidth: number;
  pageHeight: number;
  scale: number;
  snapToGrid?: boolean;
  gridSize?: number;
  showGuides?: boolean;
  onSelectionChange?: (selectedElements: DraggableElement[]) => void;
}

export default function DragDropSystem({
  elements,
  onElementsChange,
  pageWidth,
  pageHeight,
  scale,
  snapToGrid = false,
  gridSize = 10,
  showGuides = true,
  onSelectionChange
}: DragDropSystemProps) {
  const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set());
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    dragType: 'move' | 'resize' | 'rotate' | 'select';
    startPos: { x: number; y: number };
    startElements: DraggableElement[];
    resizeHandle?: string;
  }>({
    isDragging: false,
    dragType: 'move',
    startPos: { x: 0, y: 0 },
    startElements: []
  });

  const [selectionBox, setSelectionBox] = useState<{
    isActive: boolean;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  }>({
    isActive: false,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0
  });

  const [guides, setGuides] = useState<{
    vertical: number[];
    horizontal: number[];
  }>({
    vertical: [],
    horizontal: []
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate selection bounds
  const selectionBounds = useCallback((): SelectionBounds | null => {
    const selected = elements.filter(el => selectedElements.has(el.id));
    if (selected.length === 0) return null;

    const minX = Math.min(...selected.map(el => el.x));
    const minY = Math.min(...selected.map(el => el.y));
    const maxX = Math.max(...selected.map(el => el.x + el.width));
    const maxY = Math.max(...selected.map(el => el.y + el.height));

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      rotation: selected.length === 1 ? selected[0].rotation : 0
    };
  }, [elements, selectedElements]);

  // Snap to grid function
  const snapToGridCoord = useCallback((coord: number): number => {
    if (!snapToGrid) return coord;
    return Math.round(coord / gridSize) * gridSize;
  }, [snapToGrid, gridSize]);

  // Find alignment guides
  const findGuides = useCallback((movingElements: DraggableElement[]): { vertical: number[]; horizontal: number[] } => {
    if (!showGuides || movingElements.length === 0) return { vertical: [], horizontal: [] };

    const staticElements = elements.filter(el => !movingElements.find(me => me.id === el.id));
    const guides: { vertical: number[]; horizontal: number[] } = { vertical: [], horizontal: [] };

    movingElements.forEach(movingEl => {
      staticElements.forEach(staticEl => {
        const tolerance = 5 / scale;

        // Vertical guides (alignment)
        const movingLeft = movingEl.x;
        const movingRight = movingEl.x + movingEl.width;
        const movingCenterX = movingEl.x + movingEl.width / 2;

        const staticLeft = staticEl.x;
        const staticRight = staticEl.x + staticEl.width;
        const staticCenterX = staticEl.x + staticEl.width / 2;

        if (Math.abs(movingLeft - staticLeft) < tolerance) guides.vertical.push(staticLeft);
        if (Math.abs(movingLeft - staticRight) < tolerance) guides.vertical.push(staticRight);
        if (Math.abs(movingLeft - staticCenterX) < tolerance) guides.vertical.push(staticCenterX);
        if (Math.abs(movingRight - staticLeft) < tolerance) guides.vertical.push(staticLeft);
        if (Math.abs(movingRight - staticRight) < tolerance) guides.vertical.push(staticRight);
        if (Math.abs(movingRight - staticCenterX) < tolerance) guides.vertical.push(staticCenterX);
        if (Math.abs(movingCenterX - staticCenterX) < tolerance) guides.vertical.push(staticCenterX);

        // Horizontal guides (alignment)
        const movingTop = movingEl.y;
        const movingBottom = movingEl.y + movingEl.height;
        const movingCenterY = movingEl.y + movingEl.height / 2;

        const staticTop = staticEl.y;
        const staticBottom = staticEl.y + staticEl.height;
        const staticCenterY = staticEl.y + staticEl.height / 2;

        if (Math.abs(movingTop - staticTop) < tolerance) guides.horizontal.push(staticTop);
        if (Math.abs(movingTop - staticBottom) < tolerance) guides.horizontal.push(staticBottom);
        if (Math.abs(movingTop - staticCenterY) < tolerance) guides.horizontal.push(staticCenterY);
        if (Math.abs(movingBottom - staticTop) < tolerance) guides.horizontal.push(staticTop);
        if (Math.abs(movingBottom - staticBottom) < tolerance) guides.horizontal.push(staticBottom);
        if (Math.abs(movingBottom - staticCenterY) < tolerance) guides.horizontal.push(staticCenterY);
        if (Math.abs(movingCenterY - staticCenterY) < tolerance) guides.horizontal.push(staticCenterY);
      });
    });

    // Remove duplicates and sort
    guides.vertical = [...new Set(guides.vertical)].sort((a, b) => a - b);
    guides.horizontal = [...new Set(guides.horizontal)].sort((a, b) => a - b);

    return guides;
  }, [elements, scale, showGuides]);

  // Handle mouse down
  const handleMouseDown = (e: React.MouseEvent, elementId?: string) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    if (elementId) {
      // Clicking on an element
      const element = elements.find(el => el.id === elementId);
      if (!element || element.isLocked) return;

      // Check if clicking on resize handle
      const bounds = selectionBounds();
      let resizeHandle: string | undefined;
      
      if (bounds && selectedElements.has(elementId)) {
        const handleSize = 8 / scale;
        const handles = [
          { name: 'nw', x: bounds.x - handleSize/2, y: bounds.y - handleSize/2 },
          { name: 'ne', x: bounds.x + bounds.width - handleSize/2, y: bounds.y - handleSize/2 },
          { name: 'sw', x: bounds.x - handleSize/2, y: bounds.y + bounds.height - handleSize/2 },
          { name: 'se', x: bounds.x + bounds.width - handleSize/2, y: bounds.y + bounds.height - handleSize/2 },
          { name: 'n', x: bounds.x + bounds.width/2 - handleSize/2, y: bounds.y - handleSize/2 },
          { name: 's', x: bounds.x + bounds.width/2 - handleSize/2, y: bounds.y + bounds.height - handleSize/2 },
          { name: 'w', x: bounds.x - handleSize/2, y: bounds.y + bounds.height/2 - handleSize/2 },
          { name: 'e', x: bounds.x + bounds.width - handleSize/2, y: bounds.y + bounds.height/2 - handleSize/2 }
        ];

        const clickedHandle = handles.find(handle => 
          x >= handle.x && x <= handle.x + handleSize &&
          y >= handle.y && y <= handle.y + handleSize
        );

        if (clickedHandle) {
          resizeHandle = clickedHandle.name;
        }
      }

      if (!selectedElements.has(elementId) && !e.shiftKey) {
        setSelectedElements(new Set([elementId]));
      } else if (e.shiftKey) {
        const newSelection = new Set(selectedElements);
        if (newSelection.has(elementId)) {
          newSelection.delete(elementId);
        } else {
          newSelection.add(elementId);
        }
        setSelectedElements(newSelection);
      }

      setDragState({
        isDragging: true,
        dragType: resizeHandle ? 'resize' : 'move',
        startPos: { x, y },
        startElements: elements.filter(el => selectedElements.has(el.id) || el.id === elementId),
        resizeHandle
      });

    } else {
      // Clicking on empty space - start selection box
      setSelectionBox({
        isActive: true,
        startX: x,
        startY: y,
        endX: x,
        endY: y
      });

      if (!e.shiftKey) {
        setSelectedElements(new Set());
      }
    }

    e.preventDefault();
  };

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    if (dragState.isDragging) {
      const deltaX = x - dragState.startPos.x;
      const deltaY = y - dragState.startPos.y;

      if (dragState.dragType === 'move') {
        // Move elements
        const movingElements = dragState.startElements.map(el => ({
          ...el,
          x: snapToGridCoord(el.x + deltaX),
          y: snapToGridCoord(el.y + deltaY)
        }));

        setGuides(findGuides(movingElements));

        onElementsChange(elements.map(el => {
          const movingEl = movingElements.find(me => me.id === el.id);
          return movingEl || el;
        }));

      } else if (dragState.dragType === 'resize' && dragState.resizeHandle) {
        // Resize elements
        const bounds = selectionBounds();
        if (!bounds) return;

        let newBounds = { ...bounds };

        switch (dragState.resizeHandle) {
          case 'nw':
            newBounds.x += deltaX;
            newBounds.y += deltaY;
            newBounds.width -= deltaX;
            newBounds.height -= deltaY;
            break;
          case 'ne':
            newBounds.y += deltaY;
            newBounds.width += deltaX;
            newBounds.height -= deltaY;
            break;
          case 'sw':
            newBounds.x += deltaX;
            newBounds.width -= deltaX;
            newBounds.height += deltaY;
            break;
          case 'se':
            newBounds.width += deltaX;
            newBounds.height += deltaY;
            break;
          case 'n':
            newBounds.y += deltaY;
            newBounds.height -= deltaY;
            break;
          case 's':
            newBounds.height += deltaY;
            break;
          case 'w':
            newBounds.x += deltaX;
            newBounds.width -= deltaX;
            break;
          case 'e':
            newBounds.width += deltaX;
            break;
        }

        // Apply minimum size constraints
        newBounds.width = Math.max(newBounds.width, 10);
        newBounds.height = Math.max(newBounds.height, 10);

        // Update selected elements proportionally
        const scaleX = newBounds.width / bounds.width;
        const scaleY = newBounds.height / bounds.height;

        onElementsChange(elements.map(el => {
          if (!selectedElements.has(el.id)) return el;

          const relativeX = (el.x - bounds.x) / bounds.width;
          const relativeY = (el.y - bounds.y) / bounds.height;

          return {
            ...el,
            x: newBounds.x + relativeX * newBounds.width,
            y: newBounds.y + relativeY * newBounds.height,
            width: el.width * scaleX,
            height: el.height * scaleY
          };
        }));
      }

    } else if (selectionBox.isActive) {
      // Update selection box
      setSelectionBox(prev => ({
        ...prev,
        endX: x,
        endY: y
      }));

      // Find elements within selection box
      const minX = Math.min(selectionBox.startX, x);
      const maxX = Math.max(selectionBox.startX, x);
      const minY = Math.min(selectionBox.startY, y);
      const maxY = Math.max(selectionBox.startY, y);

      const elementsInBox = elements.filter(el => 
        el.x >= minX && el.x + el.width <= maxX &&
        el.y >= minY && el.y + el.height <= maxY &&
        !el.isLocked
      );

      const newSelection = new Set([
        ...(e.shiftKey ? selectedElements : []),
        ...elementsInBox.map(el => el.id)
      ]);

      setSelectedElements(newSelection);
    }
  };

  // Handle mouse up
  const handleMouseUp = () => {
    setDragState({
      isDragging: false,
      dragType: 'move',
      startPos: { x: 0, y: 0 },
      startElements: []
    });

    setSelectionBox({
      isActive: false,
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0
    });

    setGuides({ vertical: [], horizontal: [] });
  };

  // Update selection change callback
  useEffect(() => {
    const selected = elements.filter(el => selectedElements.has(el.id));
    if (onSelectionChange) {
      onSelectionChange(selected);
    }
  }, [selectedElements, elements, onSelectionChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedElements.size === 0) return;

      const moveDistance = e.shiftKey ? 10 : 1;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          onElementsChange(elements.map(el => 
            selectedElements.has(el.id) 
              ? { ...el, y: el.y - moveDistance }
              : el
          ));
          break;
        case 'ArrowDown':
          e.preventDefault();
          onElementsChange(elements.map(el => 
            selectedElements.has(el.id) 
              ? { ...el, y: el.y + moveDistance }
              : el
          ));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onElementsChange(elements.map(el => 
            selectedElements.has(el.id) 
              ? { ...el, x: el.x - moveDistance }
              : el
          ));
          break;
        case 'ArrowRight':
          e.preventDefault();
          onElementsChange(elements.map(el => 
            selectedElements.has(el.id) 
              ? { ...el, x: el.x + moveDistance }
              : el
          ));
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          onElementsChange(elements.filter(el => !selectedElements.has(el.id)));
          setSelectedElements(new Set());
          break;
        case 'Escape':
          setSelectedElements(new Set());
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElements, elements, onElementsChange]);

  const bounds = selectionBounds();

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-white"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        width: pageWidth * scale,
        height: pageHeight * scale,
        cursor: dragState.isDragging ? 'grabbing' : 'default'
      }}
    >
      {/* Grid */}
      {snapToGrid && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, #e0e0e0 1px, transparent 1px),
              linear-gradient(to bottom, #e0e0e0 1px, transparent 1px)
            `,
            backgroundSize: `${gridSize * scale}px ${gridSize * scale}px`
          }}
        />
      )}

      {/* Alignment Guides */}
      {guides.vertical.map((x, index) => (
        <div
          key={`v-${index}`}
          className="absolute bg-red-500 pointer-events-none"
          style={{
            left: x * scale,
            top: 0,
            width: 1,
            height: '100%',
            zIndex: 1000
          }}
        />
      ))}
      {guides.horizontal.map((y, index) => (
        <div
          key={`h-${index}`}
          className="absolute bg-red-500 pointer-events-none"
          style={{
            left: 0,
            top: y * scale,
            width: '100%',
            height: 1,
            zIndex: 1000
          }}
        />
      ))}

      {/* Elements */}
      {elements.map(element => (
        <div
          key={element.id}
          className={clsx(
            'absolute cursor-move select-none',
            element.isSelected && 'ring-2 ring-blue-500',
            element.isLocked && 'opacity-50 cursor-not-allowed',
            !element.isVisible && 'opacity-0'
          )}
          style={{
            left: element.x * scale,
            top: element.y * scale,
            width: element.width * scale,
            height: element.height * scale,
            transform: `rotate(${element.rotation}deg) scale(${element.scale})`,
            transformOrigin: 'center',
            zIndex: element.zIndex
          }}
          onMouseDown={(e) => handleMouseDown(e, element.id)}
        >
          {/* Element content based on type */}
          {element.type === 'text' && (
            <div
              className="w-full h-full flex items-center justify-center text-black bg-transparent border border-dashed border-gray-300"
              style={{ fontSize: 14 * scale }}
            >
              {element.data.text || 'Text Element'}
            </div>
          )}
          
          {element.type === 'image' && (
            <div className="w-full h-full bg-gray-200 border border-dashed border-gray-300 flex items-center justify-center">
              <Image size={24 * scale} className="text-gray-400" />
            </div>
          )}
          
          {element.type === 'shape' && (
            <div className={clsx(
              'w-full h-full border-2 border-blue-500',
              element.data.shape === 'circle' ? 'rounded-full' : 'rounded-none'
            )} />
          )}
        </div>
      ))}

      {/* Selection Box */}
      {selectionBox.isActive && (
        <div
          className="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-20 pointer-events-none"
          style={{
            left: Math.min(selectionBox.startX, selectionBox.endX) * scale,
            top: Math.min(selectionBox.startY, selectionBox.endY) * scale,
            width: Math.abs(selectionBox.endX - selectionBox.startX) * scale,
            height: Math.abs(selectionBox.endY - selectionBox.startY) * scale
          }}
        />
      )}

      {/* Selection Bounds and Handles */}
      {bounds && selectedElements.size > 0 && (
        <div
          className="absolute border-2 border-blue-500 pointer-events-none"
          style={{
            left: bounds.x * scale,
            top: bounds.y * scale,
            width: bounds.width * scale,
            height: bounds.height * scale,
            transform: `rotate(${bounds.rotation}deg)`,
            transformOrigin: 'center'
          }}
        >
          {/* Resize Handles */}
          {['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'].map(handle => {
            const handleSize = 8;
            let x = 0, y = 0;

            switch (handle) {
              case 'nw': x = -handleSize/2; y = -handleSize/2; break;
              case 'ne': x = bounds.width * scale - handleSize/2; y = -handleSize/2; break;
              case 'sw': x = -handleSize/2; y = bounds.height * scale - handleSize/2; break;
              case 'se': x = bounds.width * scale - handleSize/2; y = bounds.height * scale - handleSize/2; break;
              case 'n': x = bounds.width * scale / 2 - handleSize/2; y = -handleSize/2; break;
              case 's': x = bounds.width * scale / 2 - handleSize/2; y = bounds.height * scale - handleSize/2; break;
              case 'w': x = -handleSize/2; y = bounds.height * scale / 2 - handleSize/2; break;
              case 'e': x = bounds.width * scale - handleSize/2; y = bounds.height * scale / 2 - handleSize/2; break;
            }

            return (
              <div
                key={handle}
                className="absolute bg-blue-500 border-2 border-white pointer-events-auto cursor-nwse-resize"
                style={{
                  left: x,
                  top: y,
                  width: handleSize,
                  height: handleSize,
                  cursor: `${handle}-resize`
                }}
                onMouseDown={(e) => handleMouseDown(e)}
              />
            );
          })}

          {/* Rotation Handle */}
          <div
            className="absolute bg-green-500 border-2 border-white rounded-full pointer-events-auto cursor-grab"
            style={{
              left: bounds.width * scale / 2 - 4,
              top: -20,
              width: 8,
              height: 8
            }}
          />
        </div>
      )}
    </div>
  );
}