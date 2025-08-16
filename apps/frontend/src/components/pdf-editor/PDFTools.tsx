import React, { useState, useRef } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
  Upload, FileText, Merge, Split, Minus, Download, Trash2, 
  X, Check, AlertCircle
} from 'lucide-react';
import { clsx } from 'clsx';
import { buildPdfServiceUrl } from '../../config/api';

interface PDFFile {
  file: File;
  preview?: string;
  pages?: number;
}

// Merge PDF Tool
export const MergePDFTool = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastMergeResult, setLastMergeResult] = useState<{fileName: string, fileCount: number, timestamp: Date} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFilesUpload = (uploadedFiles: FileList | null) => {
    if (!uploadedFiles) return;
    
    const pdfFiles = Array.from(uploadedFiles).filter(file => file.type === 'application/pdf');
    const nonPdfFiles = Array.from(uploadedFiles).filter(file => file.type !== 'application/pdf');
    
    if (nonPdfFiles.length > 0) {
      alert(`Skipped ${nonPdfFiles.length} non-PDF files. Only PDF files can be merged.`);
    }
    
    if (pdfFiles.length > 0) {
      setFiles(prev => [...prev, ...pdfFiles]);
      console.log(`Added ${pdfFiles.length} PDF files for merging`);
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFilesUpload(e.dataTransfer.files);
  };
  
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const moveFile = (from: number, to: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      const [moved] = newFiles.splice(from, 1);
      newFiles.splice(to, 0, moved);
      return newFiles;
    });
  };
  
  const mergePDFs = async () => {
    if (files.length < 2) {
      alert('Please select at least 2 PDF files to merge.');
      return;
    }
    
    setIsProcessing(true);
    try {
      const formData = new FormData();
      // Backend expects List<MultipartFile> files parameter
      files.forEach((file) => {
        formData.append('files', file);
      });
      
      console.log('Merging', files.length, 'PDF files...');
      
      const response = await fetch('/api/pdf/merge', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'merged-document.pdf';
        a.click();
        URL.revokeObjectURL(url);
        
        // Show success feedback
        setLastMergeResult({
          fileName: 'merged-document.pdf',
          fileCount: files.length,
          timestamp: new Date()
        });
        
        // Clear files after successful merge
        setTimeout(() => {
          setFiles([]);
        }, 1000);
      } else {
        const errorText = await response.text();
        console.error('Merge failed:', response.status, errorText);
        alert('Failed to merge PDFs. Please try again.');
      }
    } catch (error) {
      console.error('Merge error:', error);
      alert('An error occurred while merging PDFs. Please check your files and try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Merge PDF Files</h2>
        <p className="text-gray-600">Combine multiple PDF files into one document</p>
        {lastMergeResult && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-center space-x-2">
              <Check className="w-5 h-5 text-green-600" />
              <p className="text-green-800 font-medium">
                Successfully merged {lastMergeResult.fileCount} files into {lastMergeResult.fileName}
              </p>
            </div>
            <p className="text-green-600 text-sm mt-1">
              {lastMergeResult.timestamp.toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
      
      {/* File Upload */}
      <Card className="p-6">
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Add PDF Files</h3>
          <p className="text-gray-600">Click to browse or drag and drop PDF files here</p>
          <p className="text-sm text-gray-500 mt-2">You can add multiple files at once</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf"
            onChange={(e) => handleFilesUpload(e.target.files)}
            className="hidden"
          />
        </div>
      </Card>
      
      {/* File List */}
      {files.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Files to Merge ({files.length})</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFiles([])}
              className="text-red-600 hover:bg-red-50 hover:border-red-300"
            >
              Clear All
            </Button>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Files will be merged in the order shown below. Use ↑↓ to reorder.
          </p>
          <div className="space-y-3">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                    {index + 1}
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="font-medium text-gray-900 truncate max-w-64" title={file.name}>{file.name}</p>
                      <p className="text-sm text-gray-600">{(file.size / 1024 / 1024).toFixed(2)} MB • {new Date(file.lastModified).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {index > 0 && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => moveFile(index, index - 1)}
                      title="Move up"
                      className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-300"
                    >
                      ↑
                    </Button>
                  )}
                  {index < files.length - 1 && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => moveFile(index, index + 1)}
                      title="Move down"
                      className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-300"
                    >
                      ↓
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => removeFile(index)}
                    title="Remove file"
                    className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-300 text-red-600"
                  >
                    <X size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex justify-center">
            <Button
              onClick={mergePDFs}
              disabled={files.length < 2 || isProcessing}
              isLoading={isProcessing}
              className={clsx(
                'px-8 py-3 text-white font-semibold',
                files.length < 2 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-500 hover:bg-green-600'
              )}
            >
              <Merge size={18} className="mr-2" />
              {isProcessing ? 'Merging...' : `Merge ${files.length} Files`}
            </Button>
            {files.length < 2 && (
              <p className="text-sm text-gray-600 mt-2">
                Add at least 2 PDF files to merge
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

// Split PDF Tool
export const SplitPDFTool = ({ activeFile }: { activeFile: PDFFile | null }) => {
  const [splitMode, setSplitMode] = useState<'pages' | 'ranges'>('pages');
  const [pageRanges, setPageRanges] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const splitPDF = async () => {
    if (!activeFile) return;
    
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('pdf', activeFile.file);
      
      let splitPoints: number[] = [];
      if (splitMode === 'pages') {
        splitPoints = [1]; // Will be handled by backend
      } else {
        const ranges = pageRanges.split(',').map(r => parseInt(r.trim())).filter(n => !isNaN(n));
        splitPoints = ranges;
      }
      
      const response = await fetch('/api/pdf/split', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Split result:', result);
      }
    } catch (error) {
      console.error('Split error:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Split PDF</h2>
        <p className="text-gray-600">Divide your PDF into separate files</p>
      </div>
      
      {activeFile ? (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{activeFile.file.name}</h3>
                <p className="text-gray-600">{(activeFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Split Options</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="split-pages"
                  name="splitMode"
                  checked={splitMode === 'pages'}
                  onChange={() => setSplitMode('pages')}
                  className="w-4 h-4 text-blue-600"
                />
                <label htmlFor="split-pages" className="text-gray-900">Split into individual pages</label>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="split-ranges"
                    name="splitMode"
                    checked={splitMode === 'ranges'}
                    onChange={() => setSplitMode('ranges')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label htmlFor="split-ranges" className="text-gray-900">Split by page ranges</label>
                </div>
                {splitMode === 'ranges' && (
                  <input
                    type="text"
                    placeholder="e.g., 1-5, 6-10, 11-15"
                    value={pageRanges}
                    onChange={(e) => setPageRanges(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
              </div>
            </div>
            
            <div className="mt-6 flex justify-center">
              <Button
                onClick={splitPDF}
                disabled={isProcessing}
                isLoading={isProcessing}
                className="bg-purple-500 hover:bg-purple-600 px-8 py-3"
              >
                <Split size={18} className="mr-2" />
                Split PDF
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No PDF Selected</h3>
          <p className="text-gray-600">Please upload a PDF file to split</p>
        </Card>
      )}
    </div>
  );
};

// Compress PDF Tool
export const CompressPDFTool = ({ activeFile }: { activeFile: PDFFile | null }) => {
  const [compressionLevel, setCompressionLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{originalSize: number, compressedSize: number, savings: number} | null>(null);
  
  const compressPDF = async () => {
    if (!activeFile) return;
    
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('pdf', activeFile.file);
      formData.append('level', compressionLevel);
      
      const response = await fetch('/api/pdf/compress', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const originalSize = activeFile.file.size;
        const compressedSize = blob.size;
        const savings = ((originalSize - compressedSize) / originalSize) * 100;
        
        setResult({ originalSize, compressedSize, savings });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = activeFile.file.name.replace('.pdf', '-compressed.pdf');
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Compression error:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Compress PDF</h2>
        <p className="text-gray-600">Reduce file size while maintaining quality</p>
      </div>
      
      {activeFile ? (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{activeFile.file.name}</h3>
                  <p className="text-gray-600">{(activeFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              {result && (
                <div className="text-right">
                  <p className="text-sm text-gray-600">Compressed to:</p>
                  <p className="font-semibold text-green-600">{(result.compressedSize / 1024 / 1024).toFixed(2)} MB</p>
                  <p className="text-xs text-green-600">{result.savings.toFixed(1)}% smaller</p>
                </div>
              )}
            </div>
          </Card>
          
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Compression Level</h3>
            <div className="space-y-3">
              {[
                { value: 'low', label: 'Low Compression', desc: 'Smaller reduction, better quality' },
                { value: 'medium', label: 'Medium Compression', desc: 'Balanced size and quality' },
                { value: 'high', label: 'High Compression', desc: 'Maximum reduction, lower quality' }
              ].map((option) => (
                <div key={option.value} className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id={option.value}
                    name="compression"
                    value={option.value}
                    checked={compressionLevel === option.value}
                    onChange={(e) => setCompressionLevel(e.target.value as any)}
                    className="w-4 h-4 text-orange-600"
                  />
                  <div>
                    <label htmlFor={option.value} className="font-medium text-gray-900">{option.label}</label>
                    <p className="text-sm text-gray-600">{option.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex justify-center">
              <Button
                onClick={compressPDF}
                disabled={isProcessing}
                isLoading={isProcessing}
                className="bg-orange-500 hover:bg-orange-600 px-8 py-3"
              >
                <Minus size={18} className="mr-2" />
                Compress PDF
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No PDF Selected</h3>
          <p className="text-gray-600">Please upload a PDF file to compress</p>
        </Card>
      )}
    </div>
  );
};

// Convert PDF Tool
export const ConvertPDFTool = ({ activeFile }: { activeFile: PDFFile | null }) => {
  const [convertTo, setConvertTo] = useState<'word' | 'text' | 'html'>('word');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const convertPDF = async () => {
    if (!activeFile) return;
    
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('pdf', activeFile.file);
      
      let endpoint = '';
      let filename = '';
      
      switch (convertTo) {
        case 'word':
          endpoint = buildPdfServiceUrl('/advanced/convert-to-word');
          filename = activeFile.file.name.replace('.pdf', '.docx');
          break;
        case 'text':
          endpoint = buildPdfServiceUrl('/advanced/convert-to-text');
          filename = activeFile.file.name.replace('.pdf', '.txt');
          break;
        case 'html':
          endpoint = buildPdfServiceUrl('/advanced/convert-to-html');
          filename = activeFile.file.name.replace('.pdf', '.html');
          break;
        default:
          return;
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        if (convertTo === 'text' || convertTo === 'html') {
          const result = await response.json();
          const content = convertTo === 'text' ? result.text : result.html;
          const blob = new Blob([content], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error('Conversion error:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const conversionOptions = [
    { value: 'word', label: 'Microsoft Word (.docx)', icon: FileText, color: 'bg-blue-500' },
    { value: 'text', label: 'Plain Text (.txt)', icon: FileText, color: 'bg-gray-500' },
    { value: 'html', label: 'HTML (.html)', icon: FileText, color: 'bg-orange-500' }
  ];
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Convert PDF</h2>
        <p className="text-gray-600">Convert your PDF to different formats</p>
      </div>
      
      {activeFile ? (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-cyan-500 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{activeFile.file.name}</h3>
                <p className="text-gray-600">{(activeFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Convert To</h3>
            <div className="grid grid-cols-1 gap-4">
              {conversionOptions.map((option) => (
                <div
                  key={option.value}
                  className={clsx(
                    'p-4 border-2 rounded-lg cursor-pointer transition-all',
                    convertTo === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                  onClick={() => setConvertTo(option.value as any)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 ${option.color} rounded-lg flex items-center justify-center`}>
                      <option.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{option.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex justify-center">
              <Button
                onClick={convertPDF}
                disabled={isProcessing}
                isLoading={isProcessing}
                className="bg-cyan-500 hover:bg-cyan-600 px-8 py-3"
              >
                <Download size={18} className="mr-2" />
                Convert to {conversionOptions.find(o => o.value === convertTo)?.label.split('(')[0]}
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No PDF Selected</h3>
          <p className="text-gray-600">Please upload a PDF file to convert</p>
        </Card>
      )}
    </div>
  );
};

// Delete Pages Tool
export const DeletePagesTool = ({ activeFile }: { activeFile: PDFFile | null }) => {
  const [pagesToDelete, setPagesToDelete] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const deletePages = async () => {
    if (!activeFile || !pagesToDelete.trim()) return;
    
    setIsProcessing(true);
    try {
      const pages = pagesToDelete.split(',').map(p => parseInt(p.trim())).filter(n => !isNaN(n));
      
      const formData = new FormData();
      formData.append('pdf', activeFile.file);
      formData.append('pages', JSON.stringify(pages));
      
      const response = await fetch('/api/pdf/delete-pages', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = activeFile.file.name.replace('.pdf', '-pages-deleted.pdf');
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Delete pages error:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Delete Pages</h2>
        <p className="text-gray-600">Remove specific pages from your PDF</p>
      </div>
      
      {activeFile ? (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{activeFile.file.name}</h3>
                <p className="text-gray-600">{(activeFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Select Pages to Delete</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page Numbers (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g., 1, 3, 5-7, 10"
                  value={pagesToDelete}
                  onChange={(e) => setPagesToDelete(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-600 mt-2">
                  Examples: "1,3,5" deletes pages 1, 3, and 5. "2-5" deletes pages 2 through 5.
                </p>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Important:</p>
                    <p>This action cannot be undone. Make sure to specify the correct page numbers.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-center">
              <Button
                onClick={deletePages}
                disabled={isProcessing || !pagesToDelete.trim()}
                isLoading={isProcessing}
                className="bg-red-500 hover:bg-red-600 px-8 py-3"
              >
                <Trash2 size={18} className="mr-2" />
                Delete Selected Pages
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No PDF Selected</h3>
          <p className="text-gray-600">Please upload a PDF file to delete pages</p>
        </Card>
      )}
    </div>
  );
};