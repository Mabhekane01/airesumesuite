import React, { useState, useRef, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
  Upload, FileText, Edit3, PenTool, Download, RotateCw, Trash2, Split, Merge, Type, Image,
  Palette, Move, Square, Circle, Minus, Plus, Lock, Unlock, Eye, EyeOff, 
  Layers, MousePointer, Hand, Search, BookOpen, Settings, Shield, Sparkles,
  Wand2, Scissors, Copy, Stamp, FileImage, AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, Underline, Highlighter, Eraser, Grid, Ruler, ZoomIn, ZoomOut, Droplets,
  Zap, Award, Users, FileSignature, CheckSquare, Crown, ArrowLeft, MoreHorizontal,
  ChevronDown
} from 'lucide-react';
import { clsx } from 'clsx';
import MergePDFTool from './MergePDFTool';
import SplitPDFTool from './SplitPDFTool';
import { buildPdfServiceUrl } from '../../config/api';
import CompressPDFTool from './CompressPDFTool';
import ConvertPDFTool from './ConvertPDFTool';
import DeletePagesTool from './DeletePagesTool';
import ErrorDisplay from './ErrorDisplay';
import WorkingPDFEditor from './WorkingPDFEditor';
import { parseApiError, handleApiError, validatePdfFile } from './utils/errorUtils';

import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// Sejda-Style PDF Editor: Parse → Edit → Rebuild
const LivePDFEditor = ({ file, selectedTool, onTextEdit, onTextDelete, onTextAdd }: {
  file: File;
  selectedTool: EditingTool;
  onTextEdit: (textId: string, newText: string) => void;
  onTextDelete: (textId: string) => void;
  onTextAdd: (text: string, x: number, y: number) => void;
}) => {
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1.2);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  
  // Sejda-style editable model
  const [pdfModel, setPdfModel] = useState<{
    pages: Array<{
      width: number;
      height: number;
      scale: number;
      textBlocks: Array<{
        id: string;
        text: string;
        x: number;
        y: number;
        width: number;
        height: number;
        fontSize: number;
        fontFamily: string;
        color: string;
        baseline: number;
        ascent: number;
        descent: number;
        isOriginal: boolean;
        isHidden: boolean;
      }>;
    }>;
  }>({ pages: [] });
  
  const [modifications, setModifications] = useState<Array<{
    type: 'hide' | 'add' | 'replace';
    blockId?: string;
    newText?: string;
    position?: { x: number; y: number };
    pageNum: number;
  }>>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(850);
  const [hoveredTextId, setHoveredTextId] = useState<string | null>(null);

  // Create PDF URL when file changes
  React.useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);


  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  // Parse PDF into Sejda-style editable model with perfect positioning and structure preservation
  const parsePDFToEditableModel = useCallback(async (page: any) => {
    try {
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1 });
      
      console.log('Starting text extraction for page', pageNumber);
      console.log('Viewport dimensions:', { width: viewport.width, height: viewport.height });
      console.log('Found text items:', textContent.items.length);
      
      // Group text items into lines to preserve structure
      const lines: any[] = [];
      const textItems = textContent.items.filter((item: any) => item.str && item.str.trim());
      
      // Sort by Y position first, then X position to maintain reading order
      textItems.sort((a: any, b: any) => {
        const yDiff = Math.abs(a.transform[5] - b.transform[5]);
        if (yDiff < 5) { // Same line (within 5 units)
          return a.transform[4] - b.transform[4]; // Sort by X position
        }
        return b.transform[5] - a.transform[5]; // Sort by Y position (top to bottom)
      });
      
      let currentLine: any[] = [];
      let lastY = null;
      
      textItems.forEach((item: any, index: number) => {
        const transform = item.transform;
        const y = transform[5];
        
        // Check if this item should start a new line
        if (lastY !== null && Math.abs(y - lastY) > 5) {
          if (currentLine.length > 0) {
            lines.push([...currentLine]);
            currentLine = [];
          }
        }
        
        currentLine.push(item);
        lastY = y;
      });
      
      // Add the last line
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      
      console.log('Grouped into', lines.length, 'lines');
      
      // Create text blocks preserving line structure
      const textBlocks: any[] = [];
      
      lines.forEach((line, lineIndex) => {
        // Combine words in the same line that are close together
        let lineText = '';
        let lineX = Number.MAX_SAFE_INTEGER;
        let lineY = 0;
        let lineWidth = 0;
        let lineHeight = 0;
        let lineFontSize = 0;
        let lineFontFamily = '';
        
        line.forEach((item: any, itemIndex: number) => {
          const transform = item.transform;
          const x = transform[4];
          const y = transform[5];
          const fontSize = Math.abs(transform[0]);
          
          // Add appropriate spacing between words
          if (itemIndex > 0) {
            const prevItem = line[itemIndex - 1];
            const prevX = prevItem.transform[4];
            const prevWidth = prevItem.width || fontSize * prevItem.str.length * 0.6;
            const gap = x - (prevX + prevWidth);
            
            if (gap > fontSize * 0.2) { // Add space if gap is significant
              lineText += ' ';
            }
          }
          
          lineText += item.str;
          lineX = Math.min(lineX, x);
          lineY = Math.max(lineY, y); // Use the highest Y position in the line
          lineWidth = Math.max(lineWidth, x + (item.width || fontSize * item.str.length * 0.6) - lineX);
          lineHeight = Math.max(lineHeight, fontSize);
          lineFontSize = Math.max(lineFontSize, fontSize);
          lineFontFamily = item.fontName?.replace(/[+]/g, '').replace(/,.*$/, '') || 'Arial';
        });
        
        // Calculate adjusted Y position for web coordinates
        const adjustedY = viewport.height - lineY - lineHeight;
        
        const block = {
          id: `line-${pageNumber}-${lineIndex}`,
          text: lineText.trim(),
          x: Math.round(lineX),
          y: Math.round(adjustedY),
          width: Math.round(lineWidth),
          height: Math.round(lineHeight),
          fontSize: Math.round(lineFontSize),
          fontFamily: lineFontFamily,
          color: '#000000',
          baseline: Math.round(lineY),
          ascent: Math.round(lineFontSize * 0.8),
          descent: Math.round(lineFontSize * 0.2),
          isOriginal: true,
          isHidden: false
        };
        
        textBlocks.push(block);
        
        // Log first few blocks for debugging
        if (lineIndex < 3) {
          console.log(`Line ${lineIndex}:`, {
            text: block.text.substring(0, 50) + (block.text.length > 50 ? '...' : ''),
            position: { x: block.x, y: block.y },
            fontSize: block.fontSize,
            fontFamily: block.fontFamily
          });
        }
      });
      
      console.log('Successfully parsed', textBlocks.length, 'text lines');
      
      // Update the PDF model
      setPdfModel(prev => ({
        pages: [
          ...prev.pages.slice(0, pageNumber - 1),
          {
            width: viewport.width,
            height: viewport.height,
            scale: 1,
            textBlocks: textBlocks
          },
          ...prev.pages.slice(pageNumber)
        ]
      }));
      
    } catch (error) {
      console.error('Error parsing PDF to editable model:', error);
    }
  }, [pageNumber]);

  // Apply all changes to PDF via backend
  const applyChangesToPDF = useCallback(async () => {
    if (!file || modifications.length === 0) return;
    
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('modifications', JSON.stringify(modifications));
      
      const response = await fetch(buildPdfServiceUrl('/api/pdf/editor/apply-changes'), {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const newFile = new File([blob], file.name, { type: 'application/pdf' });
        
        // Update PDF URL with modified version
        const newUrl = URL.createObjectURL(newFile);
        setPdfUrl(newUrl);
        
        // Clear modifications
        setModifications([]);
        
        console.log('PDF updated successfully');
      }
    } catch (error) {
      console.error('Error applying changes:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [file, modifications]);

  // Handle canvas click for new text (Sejda-style)
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (selectedTool !== 'text') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / zoom) - 16; // Account for padding
    const clickY = ((e.clientY - rect.top) / zoom) - 16;
    
    // Add new text block to model (Sejda approach)
    const newBlockId = `new-block-${Date.now()}`;
    const newBlock = {
      id: newBlockId,
      text: 'Type your text',
      x: clickX,
      y: clickY,
      width: 120,
      height: 16,
      fontSize: 16,
      fontFamily: 'Arial',
      color: '#000000',
      baseline: clickY + 16,
      ascent: 12.8,
      descent: 3.2,
      isOriginal: false,
      isHidden: false
    };
    
    // Update PDF model
    setPdfModel(prev => {
      const newPages = [...prev.pages];
      if (newPages[pageNumber - 1]) {
        newPages[pageNumber - 1] = {
          ...newPages[pageNumber - 1],
          textBlocks: [...newPages[pageNumber - 1].textBlocks, newBlock]
        };
      }
      return { pages: newPages };
    });
    
    setEditingTextId(newBlockId);
    
    // Track modification for backend
    setModifications(prev => [...prev, {
      type: 'add',
      newText: 'Type your text',
      position: { x: clickX, y: clickY },
      pageNum: pageNumber
    }]);
  };

  // Handle text block click (like Sejda's DOM manipulation)
  const handleTextBlockClick = (blockId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedTool === 'text') {
      setEditingTextId(blockId);
    }
  };

  // Handle text change - Sejda's replace approach
  const handleTextChange = (blockId: string, newText: string) => {
    // Update the PDF model
    setPdfModel(prev => {
      const newPages = [...prev.pages];
      const currentPage = newPages[pageNumber - 1];
      if (currentPage) {
        currentPage.textBlocks = currentPage.textBlocks.map(block => 
          block.id === blockId ? { ...block, text: newText } : block
        );
      }
      return { pages: newPages };
    });
    
    // Track modification (Sejda-style)
    setModifications(prev => {
      const existing = prev.findIndex(m => m.blockId === blockId);
      const modification = {
        type: blockId.startsWith('new-block') ? 'add' : 'replace' as const,
        blockId,
        newText,
        pageNum: pageNumber
      };
      
      if (existing >= 0) {
        const newMods = [...prev];
        newMods[existing] = modification;
        return newMods;
      } else {
        return [...prev, modification];
      }
    });
    
    onTextEdit(blockId, newText);
  };

  // Handle text deletion - Sejda's whiteout approach
  const handleDeleteText = (blockId: string) => {
    // Hide the block (don't remove from model yet)
    setPdfModel(prev => {
      const newPages = [...prev.pages];
      const currentPage = newPages[pageNumber - 1];
      if (currentPage) {
        currentPage.textBlocks = currentPage.textBlocks.map(block => 
          block.id === blockId ? { ...block, isHidden: true } : block
        );
      }
      return { pages: newPages };
    });
    
    setEditingTextId(null);
    
    // Track as hide operation (like Sejda's whiteout)
    setModifications(prev => [...prev, {
      type: 'hide',
      blockId,
      pageNum: pageNumber
    }]);
    
    onTextDelete(blockId);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));

  // Calculate optimal PDF width
  const calculatePDFWidth = () => {
    const containerWidth = window.innerWidth * 0.8; // 80% of screen
    return Math.min(Math.max(700, containerWidth), 1200);
  };

  React.useEffect(() => {
    const handleResize = () => {
      setPageWidth(calculatePDFWidth());
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Clear editing state when page changes
  React.useEffect(() => {
    setEditingTextId(null);
    setHoveredTextId(null);
  }, [pageNumber]);
  
  // Apply changes via backend (Sejda's rebuild approach)
  React.useEffect(() => {
    if (modifications.length > 0) {
      console.log('PDF Model Changes:', {
        model: pdfModel,
        modifications: modifications
      });
    }
  }, [modifications, pdfModel]);

  return (
    <div className="relative w-full h-full bg-transparent flex flex-col">
      {/* Sejda-style overlay approach - PDF as base layer */}
      <style>{`
        /* Keep PDF visible as background */
        .react-pdf__Page__canvas {
          position: relative;
          z-index: 1;
        }
        
        /* Hide PDF text layer to prevent double text */
        .react-pdf__Page__textContent {
          display: none !important;
        }
        
        /* Overlay editable text positioned exactly over PDF text */
        .pdf-text-overlay {
          pointer-events: auto;
          user-select: none;
          z-index: 10;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 2px;
        }
        
        /* When not editing, make overlay transparent to show PDF underneath */
        .pdf-text-overlay.view-mode {
          background: transparent !important;
          pointer-events: none;
        }
        
        /* When editing, show white background */
        .pdf-text-overlay.edit-mode {
          background: rgba(255, 255, 255, 0.95) !important;
          pointer-events: auto;
        }
      `}</style>
      {/* Compact Controls */}
      <div className="flex items-center justify-between px-4 py-2 glass-dark border-b border-white/10">
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleZoomOut} 
            disabled={zoom <= 0.5}
            className="p-2 rounded-lg bg-white/10 text-gray-300 hover:text-brand-dark hover:bg-white/20 disabled:opacity-50 transition-colors"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-sm font-medium min-w-16 text-center text-brand-dark">{Math.round(zoom * 100)}%</span>
          <button 
            onClick={handleZoomIn} 
            disabled={zoom >= 3}
            className="p-2 rounded-lg bg-white/10 text-gray-300 hover:text-brand-dark hover:bg-white/20 disabled:opacity-50 transition-colors"
          >
            <ZoomIn size={14} />
          </button>
        </div>
        
        {numPages && (
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setPageNumber(p => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
              className="p-2 rounded-lg bg-white/10 text-gray-300 hover:text-brand-dark hover:bg-white/20 disabled:opacity-50 transition-colors"
            >
              ←
            </button>
            <span className="text-sm font-medium text-brand-dark">{pageNumber} / {numPages}</span>
            <button 
              onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
              disabled={pageNumber >= numPages}
              className="p-2 rounded-lg bg-white/10 text-gray-300 hover:text-brand-dark hover:bg-white/20 disabled:opacity-50 transition-colors"
            >
              →
            </button>
          </div>
        )}
        
        <button 
          onClick={applyChangesToPDF}
          disabled={modifications.length === 0 || isProcessing}
          className="bg-gradient-to-r from-accent-primary to-accent-secondary hover:from-accent-secondary hover:to-accent-tertiary text-white px-4 py-2 rounded-lg text-sm transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl"
        >
          {isProcessing ? 'Applying...' : `Apply Changes (${modifications.length})`}
        </button>
      </div>

      {/* Large PDF Editing Area */}
      <div className="flex-1 overflow-auto bg-transparent p-8" onClick={handleCanvasClick}>
        <div className="flex justify-center">
          <div className="relative" ref={pageRef}>
            {pdfUrl && (
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={<div className="flex items-center justify-center p-12 bg-white rounded shadow"><div className="text-gray-600">Loading PDF...</div></div>}
                error={<div className="flex items-center justify-center p-12 bg-white rounded shadow"><div className="text-red-600">Failed to load PDF</div></div>}
              >
                <div 
                  className="relative bg-white shadow-2xl rounded-xl border border-gray-200"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top center',
                  }}
                >
                  {/* PDF as base layer - visible background */}
                  <Page 
                    pageNumber={pageNumber}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    width={pageWidth}
                    onLoadSuccess={parsePDFToEditableModel}
                  />
                  
                  {/* Editable text overlays positioned exactly over PDF text */}
                  {pdfModel.pages[pageNumber - 1]?.textBlocks
                    .filter(block => !block.isHidden)
                    .map((block) => {
                      const currentPage = pdfModel.pages[pageNumber - 1];
                      const scale = pageWidth / (currentPage?.width || 595);
                      
                      return (
                        <div
                          key={block.id}
                          className={clsx(
                            "absolute select-none border border-transparent transition-all duration-150 pdf-text-overlay",
                            selectedTool === 'text' ? 'edit-mode' : 'view-mode'
                          )}
                          style={{
                            left: Math.round(block.x * scale),
                            top: Math.round(block.y * scale), 
                            fontSize: Math.round(block.fontSize * scale),
                            fontFamily: block.fontFamily,
                            color: '#000000',
                            lineHeight: 1,
                            zIndex: selectedTool === 'text' ? 50 : 5,
                            cursor: selectedTool === 'text' ? 'text' : 'default',
                            width: Math.round(block.width * scale),
                            height: Math.round(block.height * scale),
                            pointerEvents: selectedTool === 'text' ? 'auto' : 'none',
                            minHeight: Math.round(block.fontSize * scale),
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          onClick={(e) => selectedTool === 'text' && handleTextBlockClick(block.id, e)}
                          onMouseEnter={() => selectedTool === 'text' && setHoveredTextId(block.id)}
                          onMouseLeave={() => setHoveredTextId(null)}
                        >
                          {editingTextId === block.id ? (
                            <div className="relative">
                              <input
                                type="text"
                                value={block.text}
                                onChange={(e) => handleTextChange(block.id, e.target.value)}
                                onBlur={() => setEditingTextId(null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === 'Escape') {
                                    setEditingTextId(null);
                                  }
                                  if (e.key === 'Delete' && e.ctrlKey) {
                                    handleDeleteText(block.id);
                                  }
                                  e.stopPropagation();
                                }}
                                className="bg-white border-2 border-teal-500 rounded px-1 outline-none shadow-lg"
                                style={{
                                  fontSize: block.fontSize * scale,
                                  fontFamily: block.fontFamily,
                                  color: block.color,
                                  width: Math.max(60, block.text.length * (block.fontSize * scale * 0.6)),
                                  height: block.height * scale + 4
                                }}
                                autoFocus
                                onFocus={(e) => e.target.select()}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteText(block.id);
                                }}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 flex items-center justify-center shadow-md leading-none"
                                title="Delete text (whiteout)"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <div 
                              className={clsx(
                                'w-full h-full flex items-start transition-all duration-150',
                                selectedTool === 'text' ? 'cursor-text rounded-sm px-1 hover:bg-blue-100/80' : 'cursor-default',
                                selectedTool === 'text' && hoveredTextId === block.id && {
                                  'bg-blue-50/90 ring-1 ring-teal-300 shadow-sm': block.isOriginal,
                                  'bg-green-50/90 ring-1 ring-green-300 shadow-sm': !block.isOriginal
                                }
                              )}
                              title={selectedTool === 'text' ? "Click to edit this text" : ""}
                            >
                              <span 
                                className="leading-none"
                                style={{
                                  color: '#1f2937',
                                  textShadow: '0 0 1px rgba(255,255,255,0.8)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'visible',
                                  display: 'block',
                                  lineHeight: 1
                                }}
                              >
                                {block.text}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              </Document>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      {selectedTool && (
        <div className="glass-dark border-t border-white/10 text-white px-4 py-2 text-sm flex items-center justify-between">
          <div>
            {selectedTool === 'text' && (
              <span>
                ✏️ Click text to edit • Click empty space to add • Ctrl+Delete to remove
                {modifications.length > 0 && ` • ${modifications.length} changes pending`}
              </span>
            )}
          </div>
          {modifications.length > 0 && (
            <div className="text-xs bg-white/10 px-2 py-1 rounded-lg border border-white/20">
              {modifications.filter(m => m.type === 'replace').length} replaced, {modifications.filter(m => m.type === 'add').length} added, {modifications.filter(m => m.type === 'hide').length} hidden
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface PDFFile {
  file: File;
  preview?: string;
  pages?: number;
}

// Types for 3-step SeJda architecture
interface UploadedPDF {
  fileId: string;
  fileName: string;
  numPages: number;
  previewUrl?: string;
}

interface PDFChange {
  page: number;
  action: 'add_text' | 'highlight' | 'delete_text' | 'move_text' | 'replace_text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  font?: string;
  size?: number;
  color?: string;
  id: string;
  blockId?: string;
}

type AppFlow = 'landing' | 'editing';
type SelectedTool = 'edit-pdf' | 'merge-pdf' | 'split-pdf' | 'compress-pdf' | 'convert-pdf' | 'delete-pages' | 'security' | null;
type EditingTool = 'text' | 'links' | 'forms' | 'images' | 'sign' | 'annotate' | 'shapes' | 'whiteout' | null;

export default function PDFEditor() {
  const [currentFlow, setCurrentFlow] = useState<AppFlow>('landing');
  const [selectedTool, setSelectedTool] = useState<SelectedTool>(null);
  const [editingTool, setEditingTool] = useState<EditingTool>(null);
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [activeFile, setActiveFile] = useState<PDFFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 3-step SeJda architecture state
  const [uploadedPDF, setUploadedPDF] = useState<UploadedPDF | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [changes, setChanges] = useState<PDFChange[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeChange, setActiveChange] = useState<string | null>(null);
  
  // Refs for overlay editing
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Step 1: Upload PDF and get file ID (SeJda architecture)
  const handleSeJdaUpload = async (file: File) => {
    console.log('Starting SeJda upload for:', file.name, 'Size:', file.size);
    
    const validationError = validatePdfFile(file, 100 * 1024 * 1024);
    if (validationError) {
      console.error('Validation error:', validationError);
      setError(validationError);
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('Sending upload request to:', buildPdfServiceUrl('/api/pdf/editor/upload'));

      const response = await fetch(buildPdfServiceUrl('/api/pdf/editor/upload'), {
        method: 'POST',
        body: formData,
      });

      console.log('Upload response status:', response.status);

      if (!response.ok) {
        const errorMessage = await parseApiError(response);
        console.error('Upload failed:', errorMessage);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Upload result:', result);
      
      setUploadedPDF({
        fileId: result.fileId,
        fileName: file.name,
        numPages: result.numPages,
        previewUrl: result.previewUrl
      });

      setSuccess(`PDF uploaded successfully! ${result.numPages} pages ready for editing.`);
      console.log('SeJda upload complete, fileId:', result.fileId);
      
    } catch (err) {
      console.error('SeJda upload error:', err);
      setError(handleApiError(err));
      // Don't block the UI completely - they can still view the PDF
      console.log('SeJda upload failed, but PDF can still be viewed locally');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = useCallback((uploadedFiles: FileList | null) => {
    if (!uploadedFiles) return;

    const newFiles: PDFFile[] = Array.from(uploadedFiles)
      .filter(file => file.type === 'application/pdf')
      .map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));

    setFiles(prev => [...prev, ...newFiles]);
    if (newFiles.length > 0) {
      setActiveFile(newFiles[0]);
      // For edit-pdf, also trigger SeJda upload
      if (selectedTool === 'edit-pdf') {
        handleSeJdaUpload(newFiles[0].file);
      }
      setCurrentFlow('editing');
    }
  }, [selectedTool]);

  // Step 2: Handle overlay editing (SeJda-style)
  const handlePageClick = useCallback((event: React.MouseEvent) => {
    if (editingTool !== 'text' || !pageContainerRef.current || !uploadedPDF) return;

    const rect = pageContainerRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / zoom;
    const y = (event.clientY - rect.top) / zoom;

    const newChange: PDFChange = {
      id: `change_${Date.now()}_${Math.random()}`,
      page: currentPage,
      action: 'add_text',
      x,
      y,
      text: 'Click to edit text',
      font: 'Arial',
      size: 14,
      color: '#000000'
    };

    setChanges(prev => [...prev, newChange]);
    setActiveChange(newChange.id);
  }, [editingTool, currentPage, zoom, uploadedPDF]);

  // Handle text editing
  const handleTextEdit = (changeId: string, newText: string) => {
    setChanges(prev => prev.map(change => 
      change.id === changeId 
        ? { ...change, text: newText }
        : change
    ));
  };

  // Delete a change
  const handleDeleteChange = (changeId: string) => {
    setChanges(prev => prev.filter(change => change.id !== changeId));
    if (activeChange === changeId) {
      setActiveChange(null);
    }
  };

  // Step 3: Apply all changes on server
  const applyChanges = async () => {
    if (!uploadedPDF || changes.length === 0) return;

    setIsApplying(true);
    setError(null);

    try {
      const response = await fetch(buildPdfServiceUrl('/api/pdf/editor/apply-changes'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: uploadedPDF.fileId,
          changes: changes
        }),
      });

      if (!response.ok) {
        const errorMessage = await parseApiError(response);
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `edited_${uploadedPDF.fileName}`;
      link.click();
      URL.revokeObjectURL(url);

      setSuccess('Changes applied successfully! Your edited PDF has been downloaded.');
      
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setIsApplying(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFiles = e.dataTransfer.files;
    handleFileUpload(droppedFiles);
  }, [handleFileUpload]);

  // Main PDF Tools (Landing Page)
  const pdfTools = [
    { 
      id: 'edit-pdf', 
      label: 'Edit PDF', 
      icon: Edit3, 
      description: 'Edit text, images, and content',
      color: 'from-slate-600 to-slate-700'
    },
    { 
      id: 'merge-pdf', 
      label: 'Merge PDF', 
      icon: Merge, 
      description: 'Combine multiple PDFs',
      color: 'from-gray-600 to-gray-700'
    },
    { 
      id: 'split-pdf', 
      label: 'Split PDF', 
      icon: Split, 
      description: 'Divide PDF into separate files',
      color: 'from-zinc-600 to-zinc-700'
    },
    { 
      id: 'compress-pdf', 
      label: 'Compress PDF', 
      icon: Minus, 
      description: 'Reduce file size',
      color: 'from-neutral-600 to-neutral-700'
    },
    { 
      id: 'convert-pdf', 
      label: 'Convert PDF', 
      icon: Download, 
      description: 'Convert to Word, Excel, etc.',
      color: 'from-stone-600 to-stone-700'
    },
    { 
      id: 'delete-pages', 
      label: 'Delete Pages', 
      icon: Trash2, 
      description: 'Remove unwanted pages',
      color: 'from-slate-700 to-slate-800'
    }
  ];

  // Edit PDF Tools (Editing Interface)
  const editingTools = [
    { id: 'text', label: 'Text', icon: Type },
    { id: 'links', label: 'Links', icon: FileText },
    { id: 'forms', label: 'Forms', icon: CheckSquare },
    { id: 'images', label: 'Images', icon: Image },
    { id: 'sign', label: 'Sign', icon: PenTool },
    { id: 'annotate', label: 'Annotate', icon: Highlighter },
    { id: 'shapes', label: 'Shapes', icon: Square },
    { id: 'whiteout', label: 'Whiteout', icon: Eraser }
  ];

  const renderLandingPage = () => (
    <div className="min-h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary py-8 px-4 pt-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-500/20 backdrop-blur-xl border border-white/20 shadow-2xl mb-6">
            <FileText className="w-8 h-8 text-brand-dark" />
          </div>
          <h1 className="text-4xl font-bold mb-3 text-brand-dark">
            PDF Tools
          </h1>
          <p className="text-gray-400 text-lg">
            Professional PDF processing suite
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pdfTools.map(({ id, label, icon: Icon, description, color }) => {
            const isDisabled = id === 'edit-pdf' && process.env.NODE_ENV === 'production';
            
            return (
              <div
                key={id}
                className={`glass-dark border border-white/10 rounded-xl transition-all ${
                  isDisabled 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-white/10 hover:border-white/20 cursor-pointer group hover:scale-105'
                }`}
                onClick={() => {
                  // Disable edit-pdf in production
                  if (isDisabled) {
                    alert('PDF editing feature is currently under development and will be available soon!');
                    return;
                  }
                  setSelectedTool(id as SelectedTool);
                  setCurrentFlow('editing');
                }}
              >
              <div className="p-6 text-center">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${color} shadow-xl mb-3 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-brand-dark" />
                </div>
                <h3 className="text-lg font-bold text-brand-dark mb-2">{label}</h3>
                <p className="text-gray-400 text-sm">
                  {isDisabled ? 'Coming soon...' : description}
                </p>
              </div>
            </div>
            );
          })}
        </div>
        
        <div className="mt-8 text-center">
          <div className="glass-dark border border-white/10 rounded-xl p-4 inline-block">
            <p className="text-gray-400 text-sm">
              Enterprise-grade PDF processing • Secure • No data retention
            </p>
          </div>
        </div>
      </div>
    </div>
  );


  const renderEditingPage = () => {
    // Only show editing interface for Edit PDF tool
    if (selectedTool === 'edit-pdf') {
      return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary">
          {/* Compact Top Toolbar */}
          <div className="glass-dark border-b border-white/10 px-4 py-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              {/* Left Section */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setCurrentFlow('landing')}
                  className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft size={16} />
                </button>
                <span className="text-sm font-medium text-brand-dark truncate max-w-48">
                  {activeFile?.file.name}
                </span>
              </div>
              
              {/* Center - Editing Tools */}
              <div className="flex items-center space-x-1">
                {editingTools.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setEditingTool(editingTool === id ? null : id as EditingTool)}
                    className={clsx(
                      'h-8 px-3 text-xs font-medium transition-all duration-200 rounded-lg border',
                      editingTool === id 
                        ? 'bg-white/20 text-brand-dark border-white/30' 
                        : 'text-gray-400 hover:text-brand-dark hover:bg-white/10 border-white/20 hover:border-white/30'
                    )}
                  >
                    <Icon size={14} className="mr-1" />
                    {label}
                  </button>
                ))}
              </div>
              
              {/* Right Section */}
              <div className="flex items-center space-x-2">
                {/* Changes Counter */}
                {changes.length > 0 && (
                  <div className="text-xs text-gray-300 bg-white/10 px-2 py-1 rounded">
                    {changes.length} changes
                  </div>
                )}
                
                {/* Apply Changes Button */}
                <button
                  className={`h-8 px-3 text-xs rounded-lg transition-all duration-200 inline-flex items-center shadow-lg hover:shadow-xl ${
                    changes.length > 0 && !isApplying
                      ? 'bg-gradient-to-r from-accent-primary to-accent-secondary hover:from-accent-secondary hover:to-accent-tertiary text-brand-dark'
                      : 'bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-brand-dark'
                  }`}
                  onClick={applyChanges}
                  disabled={changes.length === 0 || isApplying}
                >
                  {isApplying ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                      Applying...
                    </>
                  ) : (
                    <>
                      <Download size={14} className="mr-1" />
                      Apply Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="px-4 py-2">
              <ErrorDisplay 
                error={error}
                title="Editor Error"
                onDismiss={() => setError(null)}
              />
            </div>
          )}

          {success && (
            <div className="px-4 py-2">
              <div className="bg-accent-primary/20 backdrop-blur-xl border border-accent-primary/30 rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center">
                    <span className="text-accent-primary text-sm">✓</span>
                  </div>
                  <div className="text-accent-primary text-sm">{success}</div>
                  <button 
                    onClick={() => setSuccess(null)}
                    className="ml-auto text-accent-primary hover:text-accent-secondary"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Large PDF Viewer */}
          <div className="flex-1 overflow-auto">
            <div className="h-full flex items-center justify-center p-4">
              <div className="w-full max-w-6xl h-full">
                {activeFile ? (
                  isUploading ? (
                    <div className="h-full glass-dark border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl">
                      <div className="text-center p-12">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent-secondary/20 backdrop-blur-xl border border-accent-secondary/30 shadow-2xl mb-6">
                          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent-secondary"></div>
                        </div>
                        <h3 className="text-2xl font-bold text-brand-dark mb-4">Processing PDF</h3>
                        <p className="text-brand-dark/70 mb-4">
                          Step 1: Uploading and preparing your PDF for editing...
                        </p>
                        <div className="text-sm text-gray-400">
                          File: {activeFile.file.name}
                        </div>
                      </div>
                    </div>
                  ) : uploadedPDF ? (
                  <div className="h-full rounded-2xl overflow-hidden shadow-2xl">
                    {/* Working PDF Editor */}
                    <WorkingPDFEditor 
                      file={activeFile.file} 
                      selectedTool={editingTool} 
                    />
                  </div>
                  ) : (
                    // Fallback: Show PDF without SeJda features if upload failed
                    <div className="h-full glass-dark border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                      <div className="h-full flex flex-col">
                        <div className="p-4 border-b border-white/10 bg-amber-500/20">
                          <div className="text-amber-200 text-sm">
                            ⚠️ Advanced editing unavailable. Using basic PDF viewer.
                          </div>
                        </div>
                        
                        <div className="flex-1 overflow-auto bg-gray-50">
                          <div className="flex justify-center p-4">
                            <div className="relative bg-white shadow-lg">
                              <Document
                                file={activeFile.file}
                                onLoadSuccess={({ numPages }) => console.log(`Loaded ${numPages} pages (basic mode)`)}
                                onLoadError={(error) => {
                                  console.error('PDF load error:', error);
                                  setError('Failed to load PDF. Please check the file and try again.');
                                }}
                              >
                                <Page 
                                  pageNumber={1}
                                  renderTextLayer={false}
                                  renderAnnotationLayer={false}
                                />
                              </Document>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="h-full glass-dark border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl">
                    <div className="text-center p-12">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-500/20 backdrop-blur-xl border border-white/20 shadow-2xl mb-6">
                        <Edit3 className="w-10 h-10 text-brand-dark" />
                      </div>
                      <h3 className="text-2xl font-bold text-brand-dark mb-4">Select PDF to Edit</h3>
                      <p className="text-brand-dark/70 mb-8 max-w-md">
                        Choose a PDF document to start editing text, adding annotations, and making changes.
                      </p>
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileUpload(e.target.files)}
                        className="hidden"
                      />
                      
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center px-8 py-4 rounded-xl text-brand-dark font-medium transition-all duration-300 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 shadow-xl hover:shadow-2xl hover:scale-105"
                      >
                        <Upload className="w-5 h-5 mr-2" />
                        Choose PDF File
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // For other tools, show specific tool interface
    const currentTool = pdfTools.find(tool => tool.id === selectedTool);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary pt-12">
        {/* Top Header */}
        <div className="glass-dark border-b border-white/10 px-4 py-3">
          <div className="flex items-center max-w-6xl mx-auto">
            <button
              onClick={() => setCurrentFlow('landing')}
              className="text-gray-400 hover:text-brand-dark mr-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex items-center">
              {currentTool && (
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r ${currentTool.color} mr-3 shadow-lg`}>
                  <currentTool.icon className="w-5 h-5 text-brand-dark" />
                </div>
              )}
              <h1 className="text-xl font-bold text-brand-dark">
                {currentTool?.label}
              </h1>
            </div>
          </div>
        </div>
        
        <div className="flex-1">
          {selectedTool === 'merge-pdf' && <MergePDFTool activeFile={activeFile} />}
          {selectedTool === 'split-pdf' && <SplitPDFTool activeFile={activeFile} />}
          {selectedTool === 'compress-pdf' && <CompressPDFTool activeFile={activeFile} />}
          {selectedTool === 'convert-pdf' && <ConvertPDFTool activeFile={activeFile} onFileUpload={setActiveFile} />}
          {selectedTool === 'delete-pages' && <DeletePagesTool activeFile={activeFile} />}
        </div>
      </div>
    );
  };

  return (
    <div>
      {currentFlow === 'landing' && renderLandingPage()}
      {currentFlow === 'editing' && renderEditingPage()}
    </div>
  );
}
