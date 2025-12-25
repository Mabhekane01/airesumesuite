import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { 
  MousePointer, Type, Edit3, Move, ZoomIn, ZoomOut, RotateCw, 
  Save, Undo, Redo, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Palette, Plus, Minus, Eye, Hand, Square, Circle, Trash2
} from 'lucide-react';
import { clsx } from 'clsx';

interface TextElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  alignment: 'left' | 'center' | 'right';
  rotation: number;
  isEditing: boolean;
  pageIndex: number;
}

interface PDFPage {
  canvas: HTMLCanvasElement;
  textLayer: TextElement[];
  width: number;
  height: number;
  scale: number;
}

interface AdvancedPDFCanvasProps {
  file: File;
  onSave?: (modifiedFile: File) => void;
  onTextChange?: (textElements: TextElement[]) => void;
}

export default function AdvancedPDFCanvas({ file, onSave, onTextChange }: AdvancedPDFCanvasProps) {
  const [pages, setPages] = useState<PDFPage[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [tool, setTool] = useState<'select' | 'text' | 'draw' | 'move' | 'pan'>('select');
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [history, setHistory] = useState<TextElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Text styling state
  const [textStyle, setTextStyle] = useState({
    fontSize: 14,
    fontFamily: 'Arial',
    color: '#000000',
    bold: false,
    italic: false,
    underline: false,
    alignment: 'left' as const
  });

  // Load and render PDF using PDF.js
  useEffect(() => {
    if (file) {
      loadPDF();
    }
  }, [file]);

  const loadPDF = async () => {
    try {
      setIsLoading(true);
      
      // Import PDF.js dynamically
      // @ts-ignore
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      
      const fileUrl = URL.createObjectURL(file);
      const pdf = await pdfjsLib.getDocument(fileUrl).promise;
      
      const newPages: PDFPage[] = [];
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });
        
        // Create canvas for rendering
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Render PDF page to canvas
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        // Extract text content for editing
        const textContent = await page.getTextContent();
        const extractedText: TextElement[] = [];
        
        textContent.items.forEach((item: any, index: number) => {
          if (item.str?.trim()) {
            const transform = item.transform;
            extractedText.push({
              id: `page-${pageNum}-text-${index}`,
              x: transform[4],
              y: viewport.height - transform[5], // PDF coordinates are bottom-up
              width: item.width || 100,
              height: item.height || 20,
              text: item.str,
              fontSize: Math.abs(transform[0]) || 14,
              fontFamily: item.fontName?.split('+').pop() || 'Arial',
              color: '#000000',
              bold: false,
              italic: false,
              underline: false,
              alignment: 'left',
              rotation: 0,
              isEditing: false,
              pageIndex: pageNum - 1
            });
          }
        });
        
        newPages.push({
          canvas,
          textLayer: extractedText,
          width: viewport.width,
          height: viewport.height,
          scale: 2.0
        });
      }
      
      setPages(newPages);
      setTextElements(newPages.flatMap(page => page.textLayer));
      URL.revokeObjectURL(fileUrl);
      
    } catch (error) {
      console.error('Failed to load PDF:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Render canvas with PDF and text overlays
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context || pages.length === 0) return;

    const currentPageData = pages[currentPage];
    if (!currentPageData) return;

    // Clear canvas
    canvas.width = currentPageData.width * zoom;
    canvas.height = currentPageData.height * zoom;
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw PDF page
    context.save();
    context.scale(zoom, zoom);
    context.drawImage(currentPageData.canvas, 0, 0);
    context.restore();

    // Draw text elements for current page
    const pageTextElements = textElements.filter(el => el.pageIndex === currentPage);
    
    pageTextElements.forEach(element => {
      context.save();
      
      // Apply transformations
      const x = element.x * zoom;
      const y = element.y * zoom;
      
      context.translate(x + element.width/2, y + element.height/2);
      context.rotate((element.rotation * Math.PI) / 180);
      context.translate(-element.width/2, -element.height/2);
      
      // Set font style
      const fontStyle = [
        element.bold ? 'bold' : '',
        element.italic ? 'italic' : '',
        `${element.fontSize * zoom}px`,
        element.fontFamily
      ].filter(Boolean).join(' ');
      
      context.font = fontStyle;
      context.fillStyle = element.color;
      context.textAlign = element.alignment;
      
      // Draw text
      const lines = element.text.split('\n');
      lines.forEach((line, lineIndex) => {
        const lineY = (lineIndex * element.fontSize * zoom * 1.2);
        context.fillText(line, 0, lineY);
        
        // Draw underline if needed
        if (element.underline) {
          const textWidth = context.measureText(line).width;
          context.beginPath();
          context.moveTo(0, lineY + 2);
          context.lineTo(textWidth, lineY + 2);
          context.strokeStyle = element.color;
          context.lineWidth = 1;
          context.stroke();
        }
      });
      
      // Draw selection border
      if (selectedElement === element.id) {
        context.strokeStyle = '#007bff';
        context.lineWidth = 2;
        context.setLineDash([5, 5]);
        context.strokeRect(-2, -2, element.width + 4, element.height + 4);
        
        // Draw resize handles
        const handles = [
          { x: -4, y: -4 },
          { x: element.width, y: -4 },
          { x: element.width, y: element.height },
          { x: -4, y: element.height }
        ];
        
        context.fillStyle = '#007bff';
        handles.forEach(handle => {
          context.fillRect(handle.x, handle.y, 8, 8);
        });
      }
      
      context.restore();
    });
  }, [pages, currentPage, zoom, textElements, selectedElement]);

  // Re-render when dependencies change
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Handle canvas mouse events
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    if (tool === 'text') {
      // Create new text element
      const newElement: TextElement = {
        id: `text-${Date.now()}`,
        x,
        y,
        width: 200,
        height: 30,
        text: 'Click to edit text',
        fontSize: textStyle.fontSize,
        fontFamily: textStyle.fontFamily,
        color: textStyle.color,
        bold: textStyle.bold,
        italic: textStyle.italic,
        underline: textStyle.underline,
        alignment: textStyle.alignment,
        rotation: 0,
        isEditing: false,
        pageIndex: currentPage
      };
      
      setTextElements(prev => [...prev, newElement]);
      setSelectedElement(newElement.id);
      saveToHistory([...textElements, newElement]);
      
    } else if (tool === 'select' || tool === 'move') {
      // Check if clicking on existing text element
      const pageTextElements = textElements.filter(el => el.pageIndex === currentPage);
      const clickedElement = pageTextElements.find(element => 
        x >= element.x && x <= element.x + element.width &&
        y >= element.y && y <= element.y + element.height
      );
      
      if (clickedElement) {
        setSelectedElement(clickedElement.id);
        setDragOffset({
          x: x - clickedElement.x,
          y: y - clickedElement.y
        });
        setIsDragging(true);
      } else {
        setSelectedElement(null);
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedElement) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    setTextElements(prev => prev.map(element => 
      element.id === selectedElement
        ? { ...element, x: x - dragOffset.x, y: y - dragOffset.y }
        : element
    ));
  };

  const handleCanvasMouseUp = () => {
    if (isDragging) {
      saveToHistory(textElements);
    }
    setIsDragging(false);
  };

  // Double-click to edit text
  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    const pageTextElements = textElements.filter(el => el.pageIndex === currentPage);
    const clickedElement = pageTextElements.find(element => 
      x >= element.x && x <= element.x + element.width &&
      y >= element.y && y <= element.y + element.height
    );

    if (clickedElement) {
      startTextEditing(clickedElement.id);
    }
  };

  const startTextEditing = (elementId: string) => {
    setTextElements(prev => prev.map(element => 
      element.id === elementId
        ? { ...element, isEditing: true }
        : { ...element, isEditing: false }
    ));
  };

  const finishTextEditing = (elementId: string, newText: string) => {
    setTextElements(prev => prev.map(element => 
      element.id === elementId
        ? { ...element, text: newText, isEditing: false }
        : element
    ));
    saveToHistory(textElements);
  };

  const deleteSelectedElement = () => {
    if (!selectedElement) return;
    
    const newElements = textElements.filter(el => el.id !== selectedElement);
    setTextElements(newElements);
    setSelectedElement(null);
    saveToHistory(newElements);
  };

  const saveToHistory = (elements: TextElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...elements]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setTextElements([...history[newIndex]]);
      setHistoryIndex(newIndex);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setTextElements([...history[newIndex]]);
      setHistoryIndex(newIndex);
    }
  };

  const updateSelectedElementStyle = (updates: Partial<TextElement>) => {
    if (!selectedElement) return;
    
    setTextElements(prev => prev.map(element => 
      element.id === selectedElement
        ? { ...element, ...updates }
        : element
    ));
    saveToHistory(textElements);
  };

  const handleSave = async () => {
    if (onSave) {
      // Here we would generate a new PDF with the modifications
      // For now, we'll call the onSave callback
      onSave(file);
    }
    
    if (onTextChange) {
      onTextChange(textElements);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading PDF for advanced editing...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="w-full h-full bg-gray-100">
      {/* Advanced Toolbar */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          {/* Tool Selection */}
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant={tool === 'select' ? 'primary' : 'outline'}
              onClick={() => setTool('select')}
            >
              <MousePointer size={16} />
            </Button>
            <Button
              size="sm"
              variant={tool === 'text' ? 'primary' : 'outline'}
              onClick={() => setTool('text')}
            >
              <Type size={16} />
            </Button>
            <Button
              size="sm"
              variant={tool === 'move' ? 'primary' : 'outline'}
              onClick={() => setTool('move')}
            >
              <Move size={16} />
            </Button>
            <Button
              size="sm"
              variant={tool === 'pan' ? 'primary' : 'outline'}
              onClick={() => setTool('pan')}
            >
              <Hand size={16} />
            </Button>
          </div>

          {/* Text Formatting */}
          {selectedElement && (
            <div className="flex items-center space-x-2">
              <select
                value={textStyle.fontFamily}
                onChange={(e) => {
                  setTextStyle(prev => ({ ...prev, fontFamily: e.target.value }));
                  updateSelectedElementStyle({ fontFamily: e.target.value });
                }}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Courier New">Courier New</option>
              </select>
              
              <input
                type="number"
                value={textStyle.fontSize}
                onChange={(e) => {
                  const fontSize = parseInt(e.target.value);
                  setTextStyle(prev => ({ ...prev, fontSize }));
                  updateSelectedElementStyle({ fontSize });
                }}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                min="8"
                max="72"
              />
              
              <Button
                size="sm"
                variant={textStyle.bold ? 'primary' : 'outline'}
                onClick={() => {
                  const bold = !textStyle.bold;
                  setTextStyle(prev => ({ ...prev, bold }));
                  updateSelectedElementStyle({ bold });
                }}
              >
                <Bold size={16} />
              </Button>
              
              <Button
                size="sm"
                variant={textStyle.italic ? 'primary' : 'outline'}
                onClick={() => {
                  const italic = !textStyle.italic;
                  setTextStyle(prev => ({ ...prev, italic }));
                  updateSelectedElementStyle({ italic });
                }}
              >
                <Italic size={16} />
              </Button>
              
              <Button
                size="sm"
                variant={textStyle.underline ? 'primary' : 'outline'}
                onClick={() => {
                  const underline = !textStyle.underline;
                  setTextStyle(prev => ({ ...prev, underline }));
                  updateSelectedElementStyle({ underline });
                }}
              >
                <Underline size={16} />
              </Button>
              
              <input
                type="color"
                value={textStyle.color}
                onChange={(e) => {
                  setTextStyle(prev => ({ ...prev, color: e.target.value }));
                  updateSelectedElementStyle({ color: e.target.value });
                }}
                className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
              />
              
              <Button
                size="sm"
                variant="outline"
                onClick={deleteSelectedElement}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" onClick={undo} disabled={historyIndex <= 0}>
              <Undo size={16} />
            </Button>
            <Button size="sm" variant="outline" onClick={redo} disabled={historyIndex >= history.length - 1}>
              <Redo size={16} />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.25))}>
              <ZoomOut size={16} />
            </Button>
            <span className="text-sm">{Math.round(zoom * 100)}%</span>
            <Button size="sm" variant="outline" onClick={() => setZoom(prev => Math.min(prev + 0.25, 3))}>
              <ZoomIn size={16} />
            </Button>
            <Button onClick={handleSave} className="bg-teal-600 hover:bg-blue-700">
              <Save size={16} />
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-200 p-8"
        style={{ height: 'calc(100vh - 120px)' }}
      >
        <div className="flex justify-center">
          <div className="bg-white shadow-2xl">
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onDoubleClick={handleCanvasDoubleClick}
              className={clsx(
                'cursor-crosshair',
                tool === 'select' && 'cursor-default',
                tool === 'text' && 'cursor-text',
                tool === 'move' && 'cursor-move',
                tool === 'pan' && 'cursor-grab',
                isDragging && 'cursor-grabbing'
              )}
            />
            
            {/* Inline Text Editors */}
            {textElements.filter(el => el.isEditing && el.pageIndex === currentPage).map(element => (
              <div
                key={element.id}
                style={{
                  position: 'absolute',
                  left: element.x * zoom,
                  top: element.y * zoom,
                  width: element.width * zoom,
                  height: element.height * zoom,
                  zIndex: 1000
                }}
              >
                <textarea
                  value={element.text}
                  onChange={(e) => {
                    setTextElements(prev => prev.map(el => 
                      el.id === element.id ? { ...el, text: e.target.value } : el
                    ));
                  }}
                  onBlur={(e) => finishTextEditing(element.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      finishTextEditing(element.id, e.currentTarget.value);
                    }
                    if (e.key === 'Escape') {
                      finishTextEditing(element.id, element.text);
                    }
                  }}
                  autoFocus
                  className="w-full h-full bg-transparent border-2 border-teal-500 resize-none outline-none"
                  style={{
                    fontSize: element.fontSize * zoom,
                    fontFamily: element.fontFamily,
                    color: element.color,
                    fontWeight: element.bold ? 'bold' : 'normal',
                    fontStyle: element.italic ? 'italic' : 'normal',
                    textDecoration: element.underline ? 'underline' : 'none',
                    textAlign: element.alignment
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Page Navigation */}
      {pages.length > 1 && (
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-center justify-center space-x-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 0))}
              disabled={currentPage === 0}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage + 1} of {pages.length}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, pages.length - 1))}
              disabled={currentPage === pages.length - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
