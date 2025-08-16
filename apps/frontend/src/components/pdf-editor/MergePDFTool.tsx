import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Upload, Merge, X, GripVertical, FileText, Plus, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { Document, Page } from 'react-pdf';
import { buildPdfServiceUrl } from '../../config/api';

interface PDFFile {
  id: string;
  file: File;
  name: string;
  pages?: number;
  url?: string;
}

interface MergePDFToolProps {
  activeFile?: File;
}

const MergePDFTool: React.FC<MergePDFToolProps> = ({ activeFile }) => {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeFile && activeFile instanceof File) {
      const initialFile: PDFFile = {
        id: 'active-' + Date.now(),
        file: activeFile,
        name: activeFile.name,
        url: URL.createObjectURL(activeFile)
      };
      setFiles([initialFile]);
    }
  }, [activeFile]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
        .filter(file => file instanceof File && file.type === 'application/pdf')
        .map((file, index) => ({
          id: 'uploaded-' + Date.now() + '-' + index,
          file,
          name: file.name,
          url: URL.createObjectURL(file)
        }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newFiles = [...files];
    const draggedFile = newFiles[draggedIndex];
    newFiles.splice(draggedIndex, 1);
    newFiles.splice(index, 0, draggedFile);
    
    setFiles(newFiles);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const updated = prev.filter(file => file.id !== id);
      prev.find(f => f.id === id)?.url && URL.revokeObjectURL(prev.find(f => f.id === id)!.url!);
      return updated;
    });
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newFiles = [...files];
    [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
    setFiles(newFiles);
  };

  const moveDown = (index: number) => {
    if (index === files.length - 1) return;
    const newFiles = [...files];
    [newFiles[index], newFiles[index + 1]] = [newFiles[index + 1], newFiles[index]];
    setFiles(newFiles);
  };

  const handleLoadSuccess = (index: number, { numPages }: { numPages: number }) => {
    setFiles(prev => prev.map((file, i) => 
      i === index ? { ...file, pages: numPages } : file
    ));
  };

  const handleMerge = async () => {
    if (files.length < 2) return;

    try {
      const formData = new FormData();
      files.forEach((pdfFile) => {
        formData.append('files', pdfFile.file);
      });

      const response = await fetch(buildPdfServiceUrl('/merge'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Merge failed: ${response.statusText}`);
      }

      const mergedPdfBlob = await response.blob();
      const downloadUrl = URL.createObjectURL(mergedPdfBlob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'merged-document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(downloadUrl);
      
      console.log('PDFs merged successfully!');
    } catch (error) {
      console.error('Error merging PDFs:', error);
      alert('Failed to merge PDFs. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-black/40 backdrop-blur-xl border border-gray-600/30 shadow-2xl mb-6">
            <Merge className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-3">Merge PDFs</h2>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Combine multiple PDF files into one document
          </p>
        </div>

        <div className="bg-black/20 backdrop-blur-xl border border-gray-600/20 rounded-2xl p-8">
          <div className="text-center mb-6">
            <input
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="merge-upload"
            />
            <label htmlFor="merge-upload" className="inline-flex items-center px-6 py-3 rounded-xl text-white font-medium transition-all duration-300 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 shadow-xl hover:shadow-2xl hover:scale-105 cursor-pointer">
              <Plus className="w-4 h-4 mr-2" />
              Add More PDF Files
            </label>
          </div>
        </div>

        {files.length > 0 && (
          <div className="bg-black/20 backdrop-blur-xl border border-gray-600/20 rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">PDF Files ({files.length})</h3>
              <div className="text-sm text-gray-400">
                Drag files to reorder • Files will be merged in this order
              </div>
            </div>
          
          <div className="space-y-3">
            {files.map((pdfFile, index) => (
              <div
                key={pdfFile.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  flex items-center gap-4 p-4 bg-black/20 rounded-xl border border-gray-600/20
                  transition-all duration-200 cursor-move hover:bg-black/40 hover:border-gray-500/40
                  ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
                `}
              >
                <div className="flex items-center gap-2 text-gray-400">
                  <GripVertical className="w-5 h-5" />
                  <span className="font-mono text-sm bg-black/40 text-white px-2 py-1 rounded">
                    {index + 1}
                  </span>
                </div>

                <div className="flex-shrink-0">
                  <div className="w-16 h-20 bg-black/30 border border-gray-600/30 rounded-lg shadow-lg flex items-center justify-center">
                    {pdfFile.url ? (
                      <Document
                        file={pdfFile.url}
                        onLoadSuccess={(pdf) => handleLoadSuccess(index, pdf)}
                        className="w-full h-full"
                      >
                        <Page
                          pageNumber={1}
                          width={60}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                        />
                      </Document>
                    ) : (
                      <FileText className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate" title={pdfFile.name}>
                    {pdfFile.name}
                  </div>
                  <div className="text-sm text-gray-400">
                    {pdfFile.pages ? `${pdfFile.pages} pages` : 'Loading...'}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="p-2 rounded-lg bg-black/30 text-gray-400 hover:text-white hover:bg-black/50 disabled:opacity-50 transition-colors"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === files.length - 1}
                    className="p-2 rounded-lg bg-black/30 text-gray-400 hover:text-white hover:bg-black/50 disabled:opacity-50 transition-colors"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeFile(pdfFile.id)}
                    className="p-2 rounded-lg bg-black/30 text-red-400 hover:text-red-300 hover:bg-black/50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

            {files.length > 1 && (
              <div className="mt-8 text-center">
                <button 
                  onClick={handleMerge} 
                  className="inline-flex items-center px-8 py-3 rounded-xl text-white font-medium transition-all duration-300 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 shadow-xl hover:shadow-2xl hover:scale-105"
                >
                  <Merge className="w-5 h-5 mr-2" />
                  Merge {files.length} PDFs
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MergePDFTool;