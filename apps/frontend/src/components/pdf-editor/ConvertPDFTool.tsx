import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
  FileText, Download, AlertCircle, CheckCircle, Loader2, 
  FileSpreadsheet, Presentation, Type, Globe, Zap
} from 'lucide-react';
import { clsx } from 'clsx';
import ErrorDisplay from './ErrorDisplay';
import { parseApiError, handleApiError, validatePdfFile } from './utils/errorUtils';

interface PDFFile {
  file: File;
  preview?: string;
  pages?: number;
}

interface ConvertPDFToolProps {
  activeFile: PDFFile | null;
  onFileUpload?: (file: PDFFile) => void;
}

type ConversionFormat = 'word' | 'excel' | 'powerpoint' | 'text' | 'html';

interface ConversionOption {
  id: ConversionFormat;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  endpoint: string;
  mimeType: string;
  fileExtension: string;
}

const conversionOptions: ConversionOption[] = [
  {
    id: 'word',
    label: 'Microsoft Word',
    description: 'Convert to editable DOCX document',
    icon: FileText,
    color: 'from-blue-500 to-blue-600',
    endpoint: 'http://localhost:8080/api/pdf/advanced/convert-to-word',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileExtension: 'docx'
  },
  {
    id: 'excel',
    label: 'Microsoft Excel',
    description: 'Convert to structured XLSX spreadsheet',
    icon: FileSpreadsheet,
    color: 'from-green-500 to-green-600',
    endpoint: 'http://localhost:8080/api/pdf/advanced/convert-to-excel',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileExtension: 'xlsx'
  },
  {
    id: 'powerpoint',
    label: 'Microsoft PowerPoint',
    description: 'Convert to PPTX presentation slides',
    icon: Presentation,
    color: 'from-orange-500 to-orange-600',
    endpoint: 'http://localhost:8080/api/pdf/advanced/convert-to-powerpoint',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    fileExtension: 'pptx'
  },
  {
    id: 'text',
    label: 'Plain Text',
    description: 'Extract text content only',
    icon: Type,
    color: 'from-gray-500 to-gray-600',
    endpoint: 'http://localhost:8080/api/pdf/advanced/convert-to-text',
    mimeType: 'text/plain',
    fileExtension: 'txt'
  },
  {
    id: 'html',
    label: 'HTML Web Page',
    description: 'Convert to HTML with formatting',
    icon: Globe,
    color: 'from-purple-500 to-purple-600',
    endpoint: 'http://localhost:8080/api/pdf/advanced/convert-to-html',
    mimeType: 'text/html',
    fileExtension: 'html'
  }
];

export default function ConvertPDFTool({ activeFile, onFileUpload }: ConvertPDFToolProps) {
  const [selectedFormat, setSelectedFormat] = useState<ConversionFormat | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleConvert = async (format: ConversionFormat) => {
    if (!activeFile) return;

    const option = conversionOptions.find(opt => opt.id === format);
    if (!option) return;

    setIsConverting(true);
    setError(null);
    setSuccess(null);
    setSelectedFormat(format);

    try {
      const formData = new FormData();
      formData.append('file', activeFile.file);

      const response = await fetch(option.endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorMessage = await parseApiError(response);
        throw new Error(errorMessage);
      }

      // Validate response headers
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) === 0) {
        throw new Error('Server returned empty response');
      }

      // Handle different response types with validation
      if (format === 'text') {
        // Text conversion returns JSON
        const result = await response.json();
        if (result.success && result.text && result.text.trim().length > 0) {
          // Download as text file with UTF-8 BOM for better compatibility
          const blob = new Blob(['\ufeff' + result.text], { type: 'text/plain;charset=utf-8' });
          downloadFile(blob, `converted-document.${option.fileExtension}`);
        } else {
          throw new Error('Failed to extract text content or content is empty');
        }
      } else if (format === 'html') {
        // HTML conversion returns JSON
        const result = await response.json();
        if (result.success && result.html && result.html.trim().length > 0) {
          // Download as HTML file with proper DOCTYPE
          const htmlContent = result.html.startsWith('<!DOCTYPE') ? result.html : `<!DOCTYPE html>\n${result.html}`;
          const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
          downloadFile(blob, `converted-document.${option.fileExtension}`);
        } else {
          throw new Error('Failed to convert to HTML or content is empty');
        }
      } else {
        // Binary formats (Word, Excel, PowerPoint) - validate blob
        const blob = await response.blob();
        
        // Verify blob has expected MIME type and size
        if (blob.size < 100) { // Binary files should be at least 100 bytes
          throw new Error(`Converted file is too small (${blob.size} bytes) - possible corruption`);
        }
        
        // Check if blob type matches expected format
        const expectedType = option.mimeType;
        if (blob.type && blob.type !== expectedType && !blob.type.includes('application/')) {
          console.warn(`MIME type mismatch: expected ${expectedType}, got ${blob.type}`);
        }
        
        downloadFile(blob, `converted-document.${option.fileExtension}`);
      }

      setSuccess(`Successfully converted to ${option.label}!`);
    } catch (err) {
      console.error('Conversion error:', err);
      setError(handleApiError(err));
    } finally {
      setIsConverting(false);
      setSelectedFormat(null);
    }
  };

  const downloadFile = (blob: Blob, filename: string) => {
    // Validate blob before download
    if (!blob || blob.size === 0) {
      throw new Error('Downloaded file is empty or corrupted');
    }

    console.log(`Downloading file: ${filename} (${blob.size} bytes, type: ${blob.type})`);
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    
    // Use setTimeout to ensure download starts before cleanup
    a.click();
    
    // Clean up after download with proper delay
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (file.type !== 'application/pdf') return;
    
    const pdfFile: PDFFile = {
      file,
      preview: URL.createObjectURL(file)
    };
    
    if (onFileUpload) {
      onFileUpload(pdfFile);
    }
  };

  if (!activeFile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-black/40 backdrop-blur-xl border border-gray-600/30 shadow-2xl mb-6">
              <Zap className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-white mb-3">Convert PDF</h2>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              Transform your PDF into any format you need
            </p>
          </div>

          {/* Main Content */}
          <div className="bg-black/20 backdrop-blur-xl border border-gray-600/20 rounded-2xl p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-black/30 mb-6">
                <Zap className="w-8 h-8 text-white" />
              </div>
              
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                id="convert-upload"
              />
              <label 
                htmlFor="convert-upload" 
                className="inline-flex items-center px-8 py-4 rounded-xl text-white font-medium transition-all duration-300 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 shadow-xl hover:shadow-2xl hover:scale-105 cursor-pointer mb-8"
              >
                <FileText className="w-5 h-5 mr-2" />
                Choose PDF File
              </label>
              
              <div className="bg-black/30 backdrop-blur-xl border border-gray-600/30 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-3">Conversion Formats</h3>
                <div className="space-y-2 text-gray-300 text-sm">
                  <p>• Microsoft Word (.docx)</p>
                  <p>• Microsoft Excel (.xlsx)</p>
                  <p>• Microsoft PowerPoint (.pptx)</p>
                  <p>• Plain Text (.txt)</p>
                  <p>• HTML Web Page (.html)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-black/40 backdrop-blur-xl border border-gray-600/30 shadow-2xl mb-6">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-3">Convert PDF</h2>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Transform your PDF into any format you need • <span className="text-gray-300 font-medium">{activeFile.file.name}</span>
          </p>
        </div>

        {/* Status Messages */}
        {error && (
          <ErrorDisplay 
            error={error}
            title="Conversion Failed"
            onDismiss={() => setError(null)}
          />
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

        {/* Conversion Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {conversionOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedFormat === option.id;
            const isCurrentlyConverting = isConverting && selectedFormat === option.id;

            return (
              <div 
                key={option.id}
                className={clsx(
                  'group relative cursor-pointer transition-all duration-300',
                  'bg-black/20 backdrop-blur-xl border border-gray-600/20 rounded-2xl',
                  'hover:bg-black/40 hover:border-gray-500/40 hover:scale-105 hover:shadow-2xl',
                  isSelected && isConverting && 'ring-2 ring-gray-400/50 bg-gray-800/30 border-gray-500/50'
                )}
                onClick={() => !isConverting && handleConvert(option.id)}
              >
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* Icon */}
                    <div className={clsx(
                      'inline-flex items-center justify-center w-16 h-16 rounded-xl shadow-xl flex-shrink-0 transition-all duration-300',
                      `bg-gradient-to-r ${option.color}`,
                      'group-hover:scale-110 group-hover:shadow-2xl'
                    )}>
                      {isCurrentlyConverting ? (
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      ) : (
                        <Icon className="w-8 h-8 text-white" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-gray-200 transition-colors">
                        {option.label}
                      </h3>
                      <p className="text-white/60 text-sm mb-4 leading-relaxed">
                        {option.description}
                      </p>

                      {/* Action Button */}
                      <div className={clsx(
                        'inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300',
                        isCurrentlyConverting 
                          ? 'bg-gray-700/40 text-gray-200 border border-gray-500/50' 
                          : 'bg-black/30 text-gray-300 hover:bg-black/50 hover:text-white border border-gray-600/30 hover:border-gray-500/50'
                      )}>
                        {isCurrentlyConverting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Converting...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Convert to {option.fileExtension.toUpperCase()}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hover Effect Overlay */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-gray-800/10 to-gray-700/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Footer */}
        <div className="bg-black/20 backdrop-blur-xl border border-gray-600/20 rounded-2xl p-6">
          <div className="flex items-start space-x-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-black/40 flex-shrink-0">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-2 text-lg">
                🚀 Enterprise-Grade Conversions
              </h4>
              <p className="text-white/70 leading-relaxed">
                Advanced AI-powered conversion engine preserves formatting, structure, and text positioning 
                for professional results. All files are processed securely with zero storage retention.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}