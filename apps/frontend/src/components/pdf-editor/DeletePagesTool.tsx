import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
  FileText, Trash2, AlertCircle, CheckCircle, Loader2
} from 'lucide-react';
import { Document, Page } from 'react-pdf';
import { buildPdfServiceUrl } from '../../config/api';

interface PDFFile {
  file: File;
  preview?: string;
  pages?: number;
}

interface DeletePagesToolProps {
  activeFile: PDFFile | null;
}

export default function DeletePagesTool({ activeFile: propActiveFile }: DeletePagesToolProps) {
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [showPageGrid, setShowPageGrid] = useState(false);
  const [activeFile, setActiveFile] = useState<PDFFile | null>(propActiveFile || null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (propActiveFile) {
      setActiveFile(propActiveFile);
    }
  }, [propActiveFile]);

  useEffect(() => {
    if (activeFile) {
      const url = URL.createObjectURL(activeFile.file);
      setPdfUrl(url);
      setTotalPages(activeFile.pages || 10); // Default to 10 if pages not known
      setShowPageGrid(true);
      return () => URL.revokeObjectURL(url);
    }
  }, [activeFile]);

  const togglePageSelection = (pageNum: number) => {
    setSelectedPages(prev => 
      prev.includes(pageNum) 
        ? prev.filter(p => p !== pageNum)
        : [...prev, pageNum]
    );
  };

  const selectAllPages = () => {
    const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);
    setSelectedPages(allPages);
  };

  const clearSelection = () => {
    setSelectedPages([]);
  };

  const handleDeletePages = async () => {
    if (!activeFile || selectedPages.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', activeFile.file);
      formData.append('pagesToDelete', JSON.stringify(selectedPages.sort((a, b) => a - b)));

      const response = await fetch(buildPdfServiceUrl('/delete-pages'), {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to delete pages');
      }

      const blob = await response.blob();
      
      // Validate blob before download
      if (!blob || blob.size === 0) {
        throw new Error('Downloaded file is empty or corrupted');
      }
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pages-deleted.pdf`;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      
      // Clean up with proper delay
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);

      setSuccess(`Successfully deleted ${selectedPages.length} page(s)!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete pages');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const maxSizeInBytes = 50 * 1024 * 1024; // 50MB
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Please select a valid PDF file. Only PDF files are supported.');
      return;
    }

    // Validate file size
    if (file.size > maxSizeInBytes) {
      setError(`File size too large. Maximum allowed size is 50MB. Your file is ${formatFileSize(file.size)}.`);
      return;
    }

    // File is valid, proceed with upload
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    setLoading(true);
    setError(null);
    
    console.log(`File selected: ${file.name} (${formatFileSize(file.size)})`);
    
    // Create a PDFFile object similar to other tools
    const pdfFile: PDFFile = {
      file,
      preview: url
    };

    // Set this as the active file
    setActiveFile(pdfFile);
  };

  const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('PDF loaded successfully with', numPages, 'pages');
    setTotalPages(numPages);
    setLoading(false);
    setShowPageGrid(true);
  };

  const handleLoadError = (error: Error) => {
    console.error('PDF loading error:', error);
    setLoading(false);
    setError('Error loading PDF: ' + error.message);
  };


  // Step 1: Choose PDF File (if no file)
  if (!activeFile) {
    return (
      <div className="min-h-screen bg-transparent p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-black/40 backdrop-blur-xl border border-gray-600/30 shadow-2xl mb-6">
              <Trash2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-white mb-3">Delete Pages</h2>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              Remove unwanted pages from your PDF documents
            </p>
          </div>

          {/* Main Content */}
          <div className="bg-black/20 backdrop-blur-xl border border-gray-600/20 rounded-2xl p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-black/30 mb-6">
                <Trash2 className="w-8 h-8 text-white" />
              </div>
              
              {/* Drag & Drop Upload Area */}
              <div
                className="border-2 border-dashed border-gray-600/50 rounded-xl p-8 mb-6 transition-all duration-300 hover:border-red-400/50 hover:bg-black/20"
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileUpload(e.dataTransfer.files);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('border-red-400/70', 'bg-black/30');
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-red-400/70', 'bg-black/30');
                }}
              >
                <div className="text-center">
                  <FileText className="w-12 h-12 text-white/60 mx-auto mb-4" />
                  <p className="text-white/80 text-lg font-medium mb-2">
                    Drop your PDF file here
                  </p>
                  <p className="text-white/50 text-sm mb-4">
                    or click the button below to browse
                  </p>
                  <p className="text-white/40 text-xs">
                    Maximum file size: <span className="text-red-400 font-medium">50MB</span>
                  </p>
                </div>
              </div>

              <input
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                id="delete-upload"
              />
              <label 
                htmlFor="delete-upload" 
                className="inline-flex items-center px-8 py-4 rounded-xl text-white font-medium transition-all duration-300 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-xl hover:shadow-2xl hover:scale-105 cursor-pointer mb-8"
              >
                <FileText className="w-5 h-5 mr-2" />
                Choose PDF File
              </label>
              
              <div className="bg-black/30 backdrop-blur-xl border border-gray-600/30 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-3">How it works</h3>
                <div className="space-y-2 text-gray-300 text-sm">
                  <p>• Upload your PDF document</p>
                  <p>• Select pages to delete</p>
                  <p>• Download the modified PDF</p>
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-black/20 backdrop-blur-xl border border-red-500/30 rounded-xl p-4">
              <div className="flex items-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-black/40 mr-4">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>
                <div className="text-red-300">{error}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-black/40 backdrop-blur-xl border border-gray-600/30 shadow-2xl mb-6">
            <Trash2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-3">Delete Pages</h2>
          <p className="text-white/80 text-lg max-w-2xl mx-auto mb-4">
            Remove unwanted pages from your PDF document
          </p>
          <div className="inline-flex items-center gap-6 bg-black/30 backdrop-blur-xl border border-gray-600/20 px-8 py-4 rounded-xl">
            <span className="text-white font-medium">
              {activeFile.file.name}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-white/70 text-sm">
              {formatFileSize(activeFile.file.size)}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-white/70 text-sm">
              {totalPages > 0 ? `${totalPages} pages` : 'Loading...'}
            </span>
            <span className="text-gray-400">•</span>
            <button
              onClick={() => {
                setActiveFile(null);
                setSelectedPages([]);
                setShowPageGrid(false);
                setError(null);
                setSuccess(null);
                setPdfUrl(null);
                setTotalPages(0);
                setLoading(false);
              }}
              className="text-red-400 hover:text-red-300 text-sm transition-colors"
            >
              Change File
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-black/20 backdrop-blur-xl border border-red-500/30 rounded-xl p-4">
            <div className="flex items-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-black/40 mr-4">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div className="text-red-300">{error}</div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-black/20 backdrop-blur-xl border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-black/40 mr-4">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-green-300">{success}</div>
            </div>
          </div>
        )}

        {/* Page Selection Interface */}
        {showPageGrid && (
          <div className="bg-black/20 backdrop-blur-xl border border-gray-600/20 rounded-2xl p-8">
            {/* Selection Controls */}
            <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
              <div className="flex items-center space-x-4">
                <h3 className="text-2xl font-bold text-white">Select Pages to Delete</h3>
                <div className="text-white/60">({selectedPages.length} selected)</div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={selectAllPages}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-all duration-200 border border-white/20"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-all duration-200 border border-white/20"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* PDF Document Display */}
            {pdfUrl && (
              <div className="mb-8">
                <Document
                  file={pdfUrl}
                  onLoadSuccess={handleLoadSuccess}
                  onLoadError={handleLoadError}
                  loading={
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
                        <p className="text-white/60">Loading PDF...</p>
                      </div>
                    </div>
                  }
                >
                  {/* Page Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {Array.from({ length: totalPages }, (_, i) => {
                      const pageNum = i + 1;
                      const isSelected = selectedPages.includes(pageNum);
                      return (
                        <div
                          key={pageNum}
                          onClick={() => togglePageSelection(pageNum)}
                          className={`relative group cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                            isSelected 
                              ? 'ring-2 ring-red-500 bg-red-500/20' 
                              : 'hover:ring-2 hover:ring-white/30'
                          } rounded-xl overflow-hidden`}
                        >
                          {/* PDF Page Preview */}
                          <div className="aspect-[3/4] bg-black/40 backdrop-blur-xl border border-gray-600/30 rounded-xl overflow-hidden relative">
                            <Page
                              pageNumber={pageNum}
                              width={150}
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                              className="pdf-page"
                            />
                            
                            {/* Selection Overlay */}
                            {isSelected && (
                              <div className="absolute inset-0 bg-red-500/30 backdrop-blur-sm flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                                  <Trash2 className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Page Number Badge */}
                          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 text-xs text-white font-medium">
                            {pageNum}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Document>
              </div>
            )}

            {/* Delete Action */}
            <div className="text-center">
              <button
                onClick={handleDeletePages}
                disabled={isProcessing || selectedPages.length === 0}
                className="inline-flex items-center px-8 py-4 rounded-xl text-white font-medium transition-all duration-300 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl hover:scale-105 text-lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    Deleting {selectedPages.length} Page{selectedPages.length !== 1 ? 's' : ''}...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-6 h-6 mr-3" />
                    Delete {selectedPages.length} Page{selectedPages.length !== 1 ? 's' : ''}
                    {selectedPages.length > 0 && (
                      <span className="ml-2 px-2 py-1 bg-white/20 rounded-lg text-sm">
                        {selectedPages.sort((a, b) => a - b).join(', ')}
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Info Footer */}
        <div className="bg-black/20 backdrop-blur-xl border border-gray-600/20 rounded-2xl p-6">
          <div className="flex items-start space-x-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-black/40 flex-shrink-0">
              <Trash2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-2 text-lg">
                🗑️ Smart Page Deletion
              </h4>
              <p className="text-white/70 leading-relaxed">
                Precise page removal with intelligent reordering and formatting preservation. 
                All operations are reversible and maintain document integrity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}