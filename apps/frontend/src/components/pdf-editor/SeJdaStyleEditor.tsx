import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '../ui/Button';
import { 
  Upload, Save, Download, Type, Highlighter, MousePointer, 
  Hand, ZoomIn, ZoomOut, RotateCw, Move, Trash2, Edit3
} from 'lucide-react';
import ErrorDisplay from './ErrorDisplay';
import { parseApiError, handleApiError, validatePdfFile } from './utils/errorUtils';
import { buildPdfServiceUrl } from '../../config/api';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// Types for the 3-step architecture (exactly as specified in infotouse.md)
interface UploadedPDF {
  fileId: string;
  fileName: string;
  numPages: number;
  previewUrl?: string;
}

// JSON structure exactly like infotouse.md example
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
  blockId?: string; // For modifications to existing text
}

interface EditingState {
  tool: 'select' | 'text' | 'highlight' | 'move';
  activeChange: string | null;
  isEditing: boolean;
}

const SeJdaStyleEditor: React.FC = () => {
  // Step 1: Upload state
  const [uploadedPDF, setUploadedPDF] = useState<UploadedPDF | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Step 2: Frontend editing state
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [editingState, setEditingState] = useState<EditingState>({
    tool: 'select',
    activeChange: null,
    isEditing: false
  });
  
  // JSON changes array (exactly like infotouse.md spec)
  const [changes, setChanges] = useState<PDFChange[]>([]);
  
  // Step 3: Apply changes state
  const [isApplying, setIsApplying] = useState(false);
  
  // UI state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Refs for overlay editing
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Step 1: Upload PDF and get file ID
  const handleFileUpload = async (file: File) => {
    const validationError = validatePdfFile(file, 100 * 1024 * 1024); // 100MB limit
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Upload to server and get file ID + preview
      const response = await fetch(buildPdfServiceUrl('/editor/upload'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorMessage = await parseApiError(response);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      setUploadedPDF({
        fileId: result.fileId,
        fileName: file.name,
        numPages: result.numPages,
        previewUrl: result.previewUrl
      });

      setSuccess(`PDF uploaded successfully! ${result.numPages} pages ready for editing.`);
      
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setIsUploading(false);
    }
  };

  // Step 2: Handle overlay editing (Sejda-style transparent layer)
  const handlePageClick = useCallback((event: React.MouseEvent) => {
    if (editingState.tool !== 'text' || !pageContainerRef.current) return;

    const rect = pageContainerRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / zoom;
    const y = (event.clientY - rect.top) / zoom;

    // Create change exactly like infotouse.md example
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
    setEditingState(prev => ({ ...prev, activeChange: newChange.id, isEditing: true }));
  }, [editingState.tool, currentPage, zoom]);

  // Handle highlight tool
  const handleHighlightStart = useCallback((event: React.MouseEvent) => {
    if (editingState.tool !== 'highlight' || !pageContainerRef.current) return;

    const rect = pageContainerRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / zoom;
    const y = (event.clientY - rect.top) / zoom;

    // Create highlight change like infotouse.md example
    const newChange: PDFChange = {
      id: `change_${Date.now()}_${Math.random()}`,
      page: currentPage,
      action: 'highlight',
      x,
      y,
      width: 200,
      height: 20,
      color: '#FFFF00'
    };

    setChanges(prev => [...prev, newChange]);
  }, [editingState.tool, currentPage, zoom]);

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
    if (editingState.activeChange === changeId) {
      setEditingState(prev => ({ ...prev, activeChange: null, isEditing: false }));
    }
  };

  // Step 3: Apply all changes on server
  const applyChanges = async () => {
    if (!uploadedPDF || changes.length === 0) return;

    setIsApplying(true);
    setError(null);

    try {
      // Send JSON change list + file ID to backend (exactly as specified)
      const response = await fetch(buildPdfServiceUrl('/editor/apply-changes'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: uploadedPDF.fileId,
          changes: changes // This is the JSON structure from infotouse.md
        }),
      });

      if (!response.ok) {
        const errorMessage = await parseApiError(response);
        throw new Error(errorMessage);
      }

      // Download the new edited PDF
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

  // Reset editor
  const resetEditor = () => {
    setUploadedPDF(null);
    setChanges([]);
    setEditingState({ tool: 'select', activeChange: null, isEditing: false });
    setCurrentPage(1);
    setError(null);
    setSuccess(null);
  };

  // File input handler
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-black/20 backdrop-blur-xl border border-gray-600/20 rounded-2xl p-6">
          <h1 className="text-3xl font-bold text-white mb-2">SeJda-Style PDF Editor</h1>
          <p className="text-gray-300">
            <span className="text-blue-400 font-semibold">Step 1:</span> Upload Once → 
            <span className="text-green-400 font-semibold"> Step 2:</span> Edit with live preview → 
            <span className="text-purple-400 font-semibold"> Step 3:</span> Apply changes on server
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <ErrorDisplay 
            error={error}
            title="Editor Error"
            onDismiss={() => setError(null)}
          />
        )}

        {success && (
          <div className="bg-green-900/30 backdrop-blur-xl border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-green-400 text-lg">✓</span>
              </div>
              <div className="text-green-200">{success}</div>
              <button 
                onClick={() => setSuccess(null)}
                className="ml-auto text-green-400 hover:text-green-300"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Upload Section */}
        {!uploadedPDF && (
          <div className="bg-black/20 backdrop-blur-xl border border-gray-600/20 rounded-2xl p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/20 backdrop-blur-xl border border-blue-400/30 shadow-2xl mb-6">
                <Upload className="w-10 h-10 text-blue-400" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-4">
                <span className="text-blue-400">Step 1:</span> Upload Your PDF
              </h2>
              <p className="text-gray-300 mb-8">
                PDF will be stored on server and you'll get a preview for editing
              </p>
              
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileInputChange}
                className="hidden"
                id="pdf-upload"
                disabled={isUploading}
              />
              
              <label 
                htmlFor="pdf-upload" 
                className={`inline-flex items-center px-8 py-4 rounded-xl text-white font-medium transition-all duration-300 ${
                  isUploading 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 cursor-pointer hover:scale-105'
                } shadow-xl hover:shadow-2xl`}
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Uploading to Server...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Choose PDF File
                  </>
                )}
              </label>

              <div className="mt-8 text-left bg-gray-800/30 rounded-xl p-6 max-w-md mx-auto">
                <h3 className="text-white font-semibold mb-3">How It Works:</h3>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">1.</span>
                    <span>Upload generates file ID (e.g., file_12345)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">2.</span>
                    <span>Live editing with transparent overlay</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400">3.</span>
                    <span>Changes applied with PDF library</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Editing Interface */}
        {uploadedPDF && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Toolbar */}
            <div className="lg:col-span-1">
              <div className="bg-black/20 backdrop-blur-xl border border-gray-600/20 rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-bold text-white mb-4">
                  <span className="text-green-400">Step 2:</span> Live Editing
                </h3>
                
                {/* Tool Selection */}
                <div className="space-y-2">
                  <Button
                    onClick={() => setEditingState(prev => ({ ...prev, tool: 'select' }))}
                    className={`w-full justify-start ${editingState.tool === 'select' ? 'bg-blue-600' : 'bg-gray-700'}`}
                  >
                    <MousePointer className="w-4 h-4 mr-2" />
                    Select Tool
                  </Button>
                  
                  <Button
                    onClick={() => setEditingState(prev => ({ ...prev, tool: 'text' }))}
                    className={`w-full justify-start ${editingState.tool === 'text' ? 'bg-blue-600' : 'bg-gray-700'}`}
                  >
                    <Type className="w-4 h-4 mr-2" />
                    Add Text
                  </Button>
                  
                  <Button
                    onClick={() => setEditingState(prev => ({ ...prev, tool: 'highlight' }))}
                    className={`w-full justify-start ${editingState.tool === 'highlight' ? 'bg-blue-600' : 'bg-gray-700'}`}
                  >
                    <Highlighter className="w-4 h-4 mr-2" />
                    Highlight
                  </Button>
                </div>

                {/* File Info */}
                <div className="pt-4 border-t border-gray-600/20">
                  <div className="text-xs text-gray-400 mb-2">File ID:</div>
                  <div className="text-xs font-mono bg-gray-800/50 p-2 rounded text-green-400">
                    {uploadedPDF.fileId}
                  </div>
                </div>

                {/* Page Navigation */}
                <div className="pt-4 border-t border-gray-600/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm">Page</span>
                    <span className="text-gray-300 text-sm">{currentPage} / {uploadedPDF.numPages}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="flex-1"
                    >
                      ←
                    </Button>
                    <Button
                      onClick={() => setCurrentPage(prev => Math.min(uploadedPDF.numPages, prev + 1))}
                      disabled={currentPage === uploadedPDF.numPages}
                      className="flex-1"
                    >
                      →
                    </Button>
                  </div>
                </div>

                {/* Zoom Controls */}
                <div className="pt-4 border-t border-gray-600/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm">Zoom</span>
                    <span className="text-gray-300 text-sm">{Math.round(zoom * 100)}%</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
                      className="flex-1"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => setZoom(1.0)}
                      className="flex-1 text-xs"
                    >
                      100%
                    </Button>
                    <Button
                      onClick={() => setZoom(prev => Math.min(3.0, prev + 0.1))}
                      className="flex-1"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* JSON Changes Preview */}
                <div className="pt-4 border-t border-gray-600/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm">JSON Changes</span>
                    <span className="text-gray-300 text-sm">{changes.length}</span>
                  </div>
                  
                  {changes.length > 0 && (
                    <div className="bg-gray-900/50 rounded p-3 text-xs">
                      <div className="text-gray-400 mb-2">Preview:</div>
                      <pre className="text-green-400 font-mono text-xs overflow-x-auto">
                        {JSON.stringify(changes.slice(-2), null, 1)}
                      </pre>
                      {changes.length > 2 && (
                        <div className="text-gray-500 text-xs mt-1">
                          ...and {changes.length - 2} more changes
                        </div>
                      )}
                    </div>
                  )}

                  {changes.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {changes.map((change, index) => (
                        <div key={change.id} className="flex items-center justify-between bg-gray-800/50 rounded p-2 text-xs">
                          <span className="text-gray-300">
                            P{change.page}: {change.action}
                          </span>
                          <button
                            onClick={() => handleDeleteChange(change.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-gray-600/20 space-y-2">
                  <Button
                    onClick={applyChanges}
                    disabled={changes.length === 0 || isApplying}
                    className="w-full bg-purple-600 hover:bg-purple-500"
                  >
                    {isApplying ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Step 3: Applying...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Step 3: Apply Changes
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={resetEditor}
                    className="w-full bg-gray-600 hover:bg-gray-500"
                  >
                    New PDF
                  </Button>
                </div>
              </div>
            </div>

            {/* PDF Preview with Transparent Overlay (Sejda-style) */}
            <div className="lg:col-span-3">
              <div className="bg-black/20 backdrop-blur-xl border border-gray-600/20 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">{uploadedPDF.fileName}</h3>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-gray-300">
                      Tool: <span className="capitalize text-blue-400">{editingState.tool}</span>
                    </div>
                    <div className="text-gray-400">
                      {editingState.tool === 'text' && 'Click to add text'}
                      {editingState.tool === 'highlight' && 'Click to highlight'}
                      {editingState.tool === 'select' && 'Click elements to select'}
                    </div>
                  </div>
                </div>

                {/* PDF Display with Transparent Edit Overlay */}
                <div className="relative bg-white rounded-lg overflow-hidden shadow-2xl">
                  <div 
                    ref={pageContainerRef}
                    className="relative"
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                    onClick={editingState.tool === 'text' ? handlePageClick : handleHighlightStart}
                  >
                    {/* PDF Page (Base Layer) */}
                    <Document
                      file={uploadedPDF.previewUrl || `data:application/pdf;base64,${uploadedPDF.fileId}`}
                      onLoadSuccess={({ numPages }) => console.log(`Loaded ${numPages} pages`)}
                      onLoadError={(error) => setError('Failed to load PDF preview')}
                    >
                      <Page 
                        pageNumber={currentPage}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    </Document>

                    {/* Transparent Edit Overlay (Sejda-style) */}
                    <div 
                      ref={overlayRef}
                      className="absolute inset-0 pointer-events-none"
                      style={{ 
                        background: 'transparent',
                        zIndex: 10
                      }}
                    >
                      {/* Render Changes as Overlay Elements */}
                      {changes
                        .filter(change => change.page === currentPage)
                        .map(change => (
                          <div
                            key={change.id}
                            className={`absolute pointer-events-auto cursor-pointer transition-all
                              ${editingState.activeChange === change.id ? 'ring-2 ring-blue-400 ring-opacity-75' : 'hover:ring-1 hover:ring-gray-400'}
                              ${change.action === 'add_text' ? 'bg-blue-50/10 border border-blue-200/30' : ''}
                              ${change.action === 'highlight' ? 'bg-yellow-300/50 border border-yellow-400/50' : ''}
                            `}
                            style={{
                              left: change.x,
                              top: change.y,
                              width: change.width || 'auto',
                              height: change.height || 'auto',
                              minWidth: change.action === 'add_text' ? '100px' : 'auto',
                              minHeight: change.action === 'add_text' ? '20px' : 'auto',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingState(prev => ({ 
                                ...prev, 
                                activeChange: change.id, 
                                isEditing: true 
                              }));
                            }}
                          >
                            {change.action === 'add_text' && (
                              <input
                                type="text"
                                value={change.text || ''}
                                onChange={(e) => handleTextEdit(change.id, e.target.value)}
                                className="w-full bg-transparent border-none outline-none px-1"
                                style={{
                                  fontSize: (change.size || 14) * zoom,
                                  fontFamily: change.font || 'Arial',
                                  color: change.color || '#000000',
                                }}
                                onBlur={() => setEditingState(prev => ({ ...prev, isEditing: false }))}
                                autoFocus={editingState.activeChange === change.id && editingState.isEditing}
                                placeholder="Type your text"
                              />
                            )}
                            
                            {change.action === 'highlight' && (
                              <div className="w-full h-full"></div>
                            )}
                          </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Debug Info */}
                {changes.length > 0 && (
                  <div className="mt-4 text-xs text-gray-400">
                    Live Preview: {changes.length} changes tracked in JSON (no actual PDF modification until Step 3)
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeJdaStyleEditor;