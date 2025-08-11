import React, { useState, useRef, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ZoomIn, ZoomOut, RotateCw, Download, Maximize2 } from 'lucide-react';
import { clsx } from 'clsx';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  file: File;
  onTextSelect?: (text: string, x: number, y: number) => void;
  onSignaturePlace?: (x: number, y: number) => void;
  annotations?: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'text' | 'signature';
    content: string;
  }>;
}

export default function PDFViewer({ file, onTextSelect, onSignaturePlace, annotations = [] }: PDFViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string>('');

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

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 25, 300));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 25, 25));
  }, []);

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => prevPageNumber + offset);
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  const handleDownload = useCallback(() => {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  }, [file]);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement && viewerRef.current) {
      viewerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      const text = selection.toString();
      setSelectedText(text);
      // Get selection coordinates
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      onTextSelect?.(text, rect.left, rect.top);
    }
  }, [onTextSelect]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (onSignaturePlace) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      onSignaturePlace(x, y);
    }
  }, [onSignaturePlace]);

  return (
    <div 
      ref={viewerRef}
      className={clsx(
        'bg-dark-secondary rounded-xl border border-dark-border',
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-full'
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-dark-border bg-dark-tertiary/60 backdrop-blur-sm rounded-t-xl">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-dark-text-secondary">
            {file.name}
          </span>
          <span className="text-xs text-dark-text-secondary bg-dark-quaternary px-2 py-1 rounded-full">
            {zoom}%
          </span>
          {numPages && (
            <span className="text-xs text-dark-text-secondary bg-dark-quaternary px-2 py-1 rounded-full">
              Page {pageNumber} of {numPages}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={previousPage}
            disabled={pageNumber <= 1}
          >
            ←
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={nextPage}
            disabled={pageNumber >= (numPages || 1)}
          >
            →
          </Button>
          <div className="w-px h-6 bg-dark-border mx-2" />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleZoomOut}
            disabled={zoom <= 25}
          >
            <ZoomOut size={16} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleZoomIn}
            disabled={zoom >= 300}
          >
            <ZoomIn size={16} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRotate}
          >
            <RotateCw size={16} />
          </Button>
          <div className="w-px h-6 bg-dark-border mx-2" />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleFullscreen}
          >
            <Maximize2 size={16} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownload}
          >
            <Download size={16} />
          </Button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="relative h-[600px] overflow-auto bg-gray-100 flex items-start justify-center py-4">
        {pdfUrl && (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-600">Loading PDF...</div>
              </div>
            }
            error={
              <div className="flex items-center justify-center h-full">
                <div className="text-red-600">Failed to load PDF</div>
              </div>
            }
          >
            <div
              className="relative bg-white shadow-2xl"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'center top',
              }}
              onClick={handleCanvasClick}
              onMouseUp={handleTextSelection}
            >
              <Page 
                pageNumber={pageNumber}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
              
              {/* Render Annotations */}
              {annotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className={clsx(
                    'absolute border-2 border-dashed',
                    annotation.type === 'text' 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-green-400 bg-green-50'
                )}
                style={{
                  left: annotation.x,
                  top: annotation.y,
                  width: annotation.width,
                  height: annotation.height,
                }}
              >
                <div className="p-2 text-xs">
                  {annotation.content}
                </div>
              </div>
            ))}
            </div>
          </Document>
        )}
        
        {selectedText && (
          <div className="absolute bottom-4 right-4 p-3 bg-blue-50 border border-blue-200 rounded shadow-lg max-w-xs">
            <p className="text-sm text-blue-800">
              <strong>Selected text:</strong> "{selectedText}"
            </p>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between p-2 bg-dark-tertiary/40 rounded-b-xl text-xs text-dark-text-secondary">
        <span>Page {pageNumber} of {numPages || 1}</span>
        <span>Ready for editing</span>
      </div>
    </div>
  );
}