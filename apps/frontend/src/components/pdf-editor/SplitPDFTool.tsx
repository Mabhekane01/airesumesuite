import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Split, Download, FileText, Scissors, ChevronRight, ArrowRight, Check } from 'lucide-react';
import { Document, Page } from 'react-pdf';
import { buildPdfServiceUrl } from '../../config/api';

interface SplitPDFToolProps {
  activeFile?: File;
}

const SplitPDFTool: React.FC<SplitPDFToolProps> = ({ activeFile }) => {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState<boolean>(false);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [step, setStep] = useState<number>(1);

  useEffect(() => {
    if (activeFile && activeFile instanceof File) {
      setFile(activeFile);
      const url = URL.createObjectURL(activeFile);
      setPdfUrl(url);
      setLoading(true);
      
      // Cleanup URL on unmount
      return () => URL.revokeObjectURL(url);
    }
  }, [activeFile]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPdfUrl(url);
      setLoading(true);
    }
  };

  const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('PDF loaded successfully with', numPages, 'pages');
    setNumPages(numPages);
    setLoading(false);
    setStep(2); // Move to step 2 when PDF loads
  };

  const handleLoadError = (error: Error) => {
    console.error('PDF loading error:', error);
    setLoading(false);
    alert('Error loading PDF: ' + error.message);
  };

  const togglePageSelection = (pageNum: number) => {
    const newSelected = new Set(selectedPages);
    if (newSelected.has(pageNum)) {
      newSelected.delete(pageNum);
    } else {
      newSelected.add(pageNum);
    }
    setSelectedPages(newSelected);
  };

  const handleSplit = async () => {
    if (!file || selectedPages.size === 0) return;

    setStep(3); // Move to processing step

    try {
      // Convert selected pages to split points
      const splitPoints = Array.from(selectedPages).sort((a, b) => a - b);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('pages', splitPoints.join(','));

      const response = await fetch(buildPdfServiceUrl('/api/pdf/editor/extract-pages'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Extract failed: ${response.statusText}`);
      }

      // Handle PDF download
      const pdfBlob = await response.blob();
      const downloadUrl = URL.createObjectURL(pdfBlob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'extracted-pages.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(downloadUrl);
      
      console.log('Pages extracted successfully - PDF downloaded');
      setStep(4); // Success step
      
    } catch (error) {
      console.error('Error splitting PDF:', error);
      alert('Failed to split PDF. Please try again.');
      setStep(2); // Go back to selection
    }
  };

  // Step 1: Choose PDF File (if no file)
  if (!file) {
    return (
      <div className="min-h-screen bg-transparent p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-900/40 backdrop-blur-xl border border-gray-600/30 shadow-2xl mb-6">
              <Split className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-white mb-3">Split PDF</h2>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              Select specific pages to extract into a new document
            </p>
          </div>

          {/* Main Content */}
          <div className="bg-gray-900/20 backdrop-blur-xl border border-gray-600/20 rounded-2xl p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gray-900/30 mb-6">
                <Split className="w-8 h-8 text-white" />
              </div>
              
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="split-upload"
              />
              <label 
                htmlFor="split-upload" 
                className="inline-flex items-center px-8 py-4 rounded-xl text-white font-medium transition-all duration-300 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 shadow-xl hover:shadow-2xl hover:scale-105 cursor-pointer mb-8"
              >
                <FileText className="w-5 h-5 mr-2" />
                Choose PDF File
              </label>
              
              <div className="bg-gray-900/30 backdrop-blur-xl border border-gray-600/30 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-3">How it works</h3>
                <div className="space-y-2 text-gray-300 text-sm">
                  <p>• Select your PDF document</p>
                  <p>• Choose which pages to extract</p>
                  <p>• Download your new document</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Hidden Document loader to get page count */}
        {pdfUrl && (
          <div style={{ display: 'none' }}>
            <Document
              file={pdfUrl}
              onLoadSuccess={handleLoadSuccess}
              onLoadError={handleLoadError}
            >
              <Page pageNumber={1} />
            </Document>
          </div>
        )}

        {/* Progress Steps */}
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 1 ? 'bg-slate-600' : 'bg-gray-900/20'} border ${step >= 1 ? 'border-slate-500' : 'border-gray-600/30'} text-white font-bold backdrop-blur-xl`}>
              {step > 1 ? <Check className="w-5 h-5" /> : '1'}
            </div>
            <div className={`w-16 h-1 ${step >= 2 ? 'bg-slate-600' : 'bg-gray-600/30'} rounded`}></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 2 ? 'bg-slate-600' : 'bg-gray-900/20'} border ${step >= 2 ? 'border-slate-500' : 'border-gray-600/30'} text-white font-bold backdrop-blur-xl`}>
              {step > 2 ? <Check className="w-5 h-5" /> : '2'}
            </div>
            <div className={`w-16 h-1 ${step >= 3 ? 'bg-slate-600' : 'bg-gray-600/30'} rounded`}></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 3 ? 'bg-slate-600' : 'bg-gray-900/20'} border ${step >= 3 ? 'border-slate-500' : 'border-gray-600/30'} text-white font-bold backdrop-blur-xl`}>
              {step > 3 ? <Check className="w-5 h-5" /> : '3'}
            </div>
          </div>
        </div>

        {/* Step Content */}
        {step === 1 && loading && (
          <div className="bg-gray-900/20 backdrop-blur-xl border border-gray-600/20 rounded-2xl p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
            <h2 className="text-2xl font-bold text-white mb-2">Loading PDF...</h2>
            <p className="text-gray-400">Please wait while we process your document</p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <div className="bg-gray-900/20 backdrop-blur-xl border border-gray-600/20 rounded-2xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-3">
                  Select Pages
                </h2>
                <p className="text-white/80 text-lg">
                  Choose which pages to extract into a new document
                </p>
                <div className="mt-6 inline-flex items-center gap-6 bg-gray-900/30 backdrop-blur-xl border border-gray-600/20 px-8 py-4 rounded-xl">
                  <span className="text-white font-medium">
                    {file.name}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-white font-medium">
                    {numPages} pages
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-white font-medium">
                    {selectedPages.size} selected
                  </span>
                  <span className="text-gray-400">•</span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="split-change-file"
                  />
                  <label 
                    htmlFor="split-change-file" 
                    className="inline-flex items-center px-3 py-1 rounded-lg text-white text-sm font-medium transition-all duration-300 bg-slate-600/50 hover:bg-slate-600 cursor-pointer"
                  >
                    Change File
                  </label>
                </div>
              </div>

              <div className="flex justify-center gap-4 mb-8">
                <button 
                  onClick={() => setSelectedPages(new Set(Array.from({length: numPages}, (_, i) => i + 1)))}
                  className="px-6 py-3 rounded-lg bg-gray-900/30 text-white hover:bg-gray-900/50 border border-gray-600/30 hover:border-gray-500/50 transition-all duration-200"
                >
                  Select All
                </button>
                <button 
                  onClick={() => setSelectedPages(new Set())}
                  className="px-6 py-3 rounded-lg bg-gray-900/30 text-white hover:bg-gray-900/50 border border-gray-600/30 hover:border-gray-500/50 transition-all duration-200"
                >
                  Clear All
                </button>
              </div>

              {selectedPages.size > 0 && (
                <div className="text-center">
                  <button 
                    onClick={handleSplit}
                    className="inline-flex items-center px-8 py-4 rounded-xl text-white font-medium transition-all duration-300 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 shadow-xl hover:shadow-2xl hover:scale-105"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Extract {selectedPages.size} Pages
                  </button>
                </div>
              )}
            </div>

            {/* Page Grid */}
            <div className="bg-gray-900/20 backdrop-blur-xl border border-gray-600/20 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-center text-white mb-8">Select Pages</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4">
                {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
                  const isSelected = selectedPages.has(pageNum);
                  return (
                    <div 
                      key={pageNum} 
                      className={`
                        relative border-2 rounded-xl overflow-hidden cursor-pointer transition-all transform hover:scale-105 
                        ${isSelected 
                          ? 'border-slate-500 bg-slate-600/20 shadow-xl ring-2 ring-slate-400/50' 
                          : 'border-gray-600/30 hover:border-gray-500/50 hover:shadow-lg'
                        }
                      `}
                      onClick={() => togglePageSelection(pageNum)}
                    >
                      <div className="aspect-[3/4] bg-white/90">
                        {pdfUrl ? (
                          <Document file={pdfUrl} className="w-full h-full">
                            <Page
                              pageNumber={pageNum}
                              width={160}
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                            />
                          </Document>
                        ) : (
                          <div className="w-full h-full bg-gray-900/10 flex items-center justify-center">
                            <FileText className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      {/* Page Number */}
                      <div className={`
                        absolute bottom-0 left-0 right-0 text-white text-sm p-2 text-center font-bold backdrop-blur-sm
                        ${isSelected ? 'bg-slate-600/80' : 'bg-gray-900/60'}
                      `}>
                        Page {pageNum}
                      </div>
                      
                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-8 h-8 bg-slate-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg border border-slate-500">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
        </div>
      )}

        {step === 3 && (
          <div className="bg-gray-900/20 backdrop-blur-xl border border-gray-600/20 rounded-2xl p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-white mb-6"></div>
            <h2 className="text-3xl font-bold text-white mb-4">Processing...</h2>
            <p className="text-xl text-gray-400">
              Extracting {selectedPages.size} selected pages into a new document
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="bg-gray-900/20 backdrop-blur-xl border border-gray-600/20 rounded-2xl p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-600 text-white mb-6">
              <Check className="w-8 h-8" />
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">Complete!</h2>
            <p className="text-xl text-gray-400 mb-8">
              Your PDF with {selectedPages.size} selected pages has been downloaded successfully.
            </p>
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => {
                  setStep(2);
                  setSelectedPages(new Set());
                }}
                className="inline-flex items-center px-8 py-3 rounded-xl text-white font-medium transition-all duration-300 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 shadow-xl hover:shadow-2xl hover:scale-105"
              >
                <ArrowRight className="w-5 h-5 mr-2" />
                Extract More Pages
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="px-8 py-3 rounded-xl bg-gray-900/30 text-white hover:bg-gray-900/50 border border-gray-600/30 hover:border-gray-500/50 transition-all duration-200"
              >
                Start Over
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SplitPDFTool;