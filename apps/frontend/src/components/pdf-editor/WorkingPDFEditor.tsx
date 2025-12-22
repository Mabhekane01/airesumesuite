import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '../ui/Button';
import { ZoomIn, ZoomOut, Type } from 'lucide-react';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface TextBlock {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
}

interface WorkingPDFEditorProps {
  file: File;
  selectedTool?: string;
}

export default function WorkingPDFEditor({ file, selectedTool }: WorkingPDFEditorProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  
  const isTextMode = selectedTool === 'text';

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  // Extract text using PDF.js bounding boxes for pixel-perfect positioning
  const extractTextFromPage = useCallback(async (pageProxy: any) => {
    try {
      const textContent = await pageProxy.getTextContent();
      const viewport = pageProxy.getViewport({ scale: zoom }); // Use current zoom level
      
      console.log('Extracting text from page:', pageNumber, 'at zoom:', zoom);
      console.log('Text items found:', textContent.items.length);
      console.log('Viewport:', viewport.width, 'x', viewport.height);
      
      const blocks: TextBlock[] = [];
      
      // Group text items by lines to create proper text blocks
      const lines: any[][] = [];
      let currentLine: any[] = [];
      let lastY = -1;
      
      textContent.items.forEach((item: any) => {
        if (!item.str?.trim()) return;
        
        const y = item.transform[5];
        
        // If Y position changed significantly, start new line (use font-relative gap)
        if (lastY !== -1 && Math.abs(y - lastY) > Math.abs(item.transform[0]) * 0.3) {
          if (currentLine.length > 0) {
            lines.push([...currentLine]);
            currentLine = [];
          }
        }
        
        currentLine.push(item);
        lastY = y;
      });
      
      // Add final line
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      
      console.log('Grouped into', lines.length, 'lines');
      
      // Create text blocks from lines
      lines.forEach((line, lineIndex) => {
        // Combine all text in the line
        let lineText = '';
        let minX = Infinity;
        let maxX = -Infinity;
        let lineY = 0;
        let fontSize = 0;
        let fontFamily = '';
        
        line.forEach((item, itemIndex) => {
          // Add spacing between words if needed
          if (itemIndex > 0) {
            const prevItem = line[itemIndex - 1];
            const gap = item.transform[4] - (prevItem.transform[4] + (prevItem.width || 0));
            if (gap > fontSize * 0.2) {
              lineText += ' ';
            }
          }
          
          lineText += item.str;
          minX = Math.min(minX, item.transform[4]);
          maxX = Math.max(maxX, item.transform[4] + (item.width || 0));
          lineY = item.transform[5];
          fontSize = Math.max(fontSize, Math.abs(item.transform[0]));
          // Better font mapping
          const rawFontName = item.fontName || '';
          if (rawFontName.includes('Times') || rawFontName.includes('Roman')) {
            fontFamily = 'Times, "Times New Roman", serif';
          } else if (rawFontName.includes('Arial') || rawFontName.includes('Helvetica')) {
            fontFamily = 'Arial, Helvetica, sans-serif';
          } else if (rawFontName.includes('Courier') || rawFontName.includes('Mono')) {
            fontFamily = '"Courier New", Courier, monospace';
          } else {
            fontFamily = 'Arial, Helvetica, sans-serif'; // fallback
          }
        });
        
        // Convert PDF coordinates to canvas coordinates (already scaled)
        const canvasX = minX;
        const canvasY = viewport.height - lineY - fontSize;
        const canvasWidth = maxX - minX;
        
        const block: TextBlock = {
          id: `line-${pageNumber}-${lineIndex}`,
          text: lineText.trim(),
          x: canvasX,
          y: canvasY,
          width: canvasWidth,
          height: fontSize,
          fontSize: fontSize,
          fontFamily: fontFamily
        };
        
        blocks.push(block);
        
        // Debug first few blocks
        if (lineIndex < 3) {
          console.log(`Line ${lineIndex}:`, {
            text: block.text.substring(0, 50),
            x: block.x,
            y: block.y,
            width: block.width,
            height: block.height,
            fontSize: block.fontSize
          });
        }
      });
      
      setTextBlocks(blocks);
      console.log('Total text blocks created:', blocks.length);
      
    } catch (error) {
      console.error('Error extracting text:', error);
    }
  }, [pageNumber, zoom]); // Re-extract when zoom changes

  const handleTextClick = (blockId: string) => {
    if (!isTextMode) return;
    setEditingId(blockId);
  };

  const handleTextChange = (blockId: string, newText: string) => {
    setTextBlocks(prev => prev.map(block => 
      block.id === blockId ? { ...block, text: newText } : block
    ));
  };

  const handleTextBlur = () => {
    setEditingId(null);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Simple controls - no duplicate text mode button */}
      <div className="bg-white border-b p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
            variant="outline"
            size="sm"
          >
            <ZoomOut size={16} />
          </Button>
          <span className="text-sm font-mono min-w-[50px] text-center">{Math.round(zoom * 100)}%</span>
          <Button 
            onClick={() => setZoom(z => Math.min(2.0, z + 0.1))}
            variant="outline"
            size="sm"
          >
            <ZoomIn size={16} />
          </Button>
        </div>

        {numPages && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setPageNumber(p => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
              variant="outline"
              size="sm"
            >
              ←
            </Button>
            <span className="text-sm">Page {pageNumber} of {numPages}</span>
            <Button
              onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
              disabled={pageNumber >= numPages}
              variant="outline"
              size="sm"
            >
              →
            </Button>
          </div>
        )}
        
        {isTextMode && (
          <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
            Text editing mode - click any text to edit
          </div>
        )}
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto p-8 flex justify-center">
        <div 
          ref={pageRef}
          className="relative"
        >
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<div className="p-8 text-center">Loading PDF...</div>}
            error={<div className="p-8 text-center text-red-600">Failed to load PDF</div>}
          >
            <div className="relative bg-white shadow-lg">
              {/* Static PDF Canvas - Underlay */}
              <Page
                pageNumber={pageNumber}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                onLoadSuccess={extractTextFromPage}
                width={800}
                scale={zoom}
                className="pdf-canvas-underlay"
              />
              
              {/* HTML Overlay Layer - Positioned exactly over PDF text */}
              <div className="absolute inset-0 pointer-events-none">
                {textBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="absolute"
                    style={{
                      left: block.x,
                      top: block.y,
                      width: block.width,
                      height: block.height,
                      pointerEvents: isTextMode ? 'auto' : 'none',
                      zIndex: 10
                    }}
                  >
                    {editingId === block.id ? (
                      <textarea
                        value={block.text}
                        onChange={(e) => handleTextChange(block.id, e.target.value)}
                        onBlur={handleTextBlur}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            handleTextBlur();
                          }
                        }}
                        className="w-full h-full bg-white border-2 border-blue-500 resize-none outline-none px-1"
                        style={{
                          fontSize: block.fontSize,
                          fontFamily: block.fontFamily,
                          lineHeight: 1.1,
                          margin: 0,
                          padding: '2px'
                        }}
                        autoFocus
                        rows={1}
                      />
                    ) : (
                      <div 
                        className={`w-full h-full transition-all ${
                          isTextMode 
                            ? 'cursor-text hover:bg-blue-100/30 hover:border hover:border-blue-300/50' 
                            : 'cursor-default'
                        }`}
                        style={{
                          fontSize: block.fontSize,
                          fontFamily: block.fontFamily,
                          lineHeight: 1.1,
                          padding: '2px',
                          color: 'transparent', // Always transparent - shows PDF underneath
                          minHeight: block.height,
                          background: 'transparent' // Always transparent
                        }}
                        onClick={() => handleTextClick(block.id)}
                        title={isTextMode ? 'Click to edit this text' : ''}
                      >
                        {/* Empty - let PDF text show through */}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Document>
        </div>
      </div>
    </div>
  );
}
