import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Download, FileText, Zap, Check, Package, Gauge } from 'lucide-react';
import ErrorDisplay from './ErrorDisplay';
import { parseApiError, handleApiError, validatePdfFile } from './utils/errorUtils';
import { buildPdfServiceUrl } from '../../config/api';

interface CompressPDFToolProps {
  activeFile?: File;
}

type CompressionLevel = 'low' | 'medium' | 'high';

interface CompressionOption {
  level: CompressionLevel;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  reduction: string;
}

const CompressPDFTool: React.FC<CompressPDFToolProps> = ({ activeFile }) => {
  const [file, setFile] = useState<File | null>(null);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('medium');
  const [step, setStep] = useState<number>(1);
  const [processing, setProcessing] = useState<boolean>(false);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const compressionOptions: CompressionOption[] = [
    {
      level: 'low',
      name: 'Light Compression',
      description: 'Small file size reduction, keeps high quality',
      icon: <Gauge className="w-6 h-6" />,
      color: 'from-slate-600 to-slate-700',
      reduction: '~10-20% smaller'
    },
    {
      level: 'medium',
      name: 'Balanced Compression',
      description: 'Good balance between size and quality',
      icon: <Zap className="w-6 h-6" />,
      color: 'from-gray-600 to-gray-700',
      reduction: '~20-30% smaller'
    },
    {
      level: 'high',
      name: 'Maximum Compression',
      description: 'Better compression, minimal quality loss',
      icon: <Package className="w-6 h-6" />,
      color: 'from-zinc-600 to-zinc-700',
      reduction: '~30-40% smaller'
    }
  ];

  useEffect(() => {
    if (activeFile && activeFile instanceof File) {
      setFile(activeFile);
      setOriginalSize(activeFile.size);
      setStep(2); // Skip to compression selection
    }
  }, [activeFile]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file before proceeding
      const validationError = validatePdfFile(selectedFile, 50 * 1024 * 1024); // 50MB limit for compression
      if (validationError) {
        setError(validationError);
        return;
      }
      
      setError(null);
      setFile(selectedFile);
      setOriginalSize(selectedFile.size);
      setStep(2);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCompress = async () => {
    if (!file) return;

    setProcessing(true);
    setStep(3);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('compressionLevel', compressionLevel);

      const response = await fetch(buildPdfServiceUrl('/api/pdf/advanced/compress'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorMessage = await parseApiError(response);
        throw new Error(errorMessage);
      }

      // Handle compressed PDF download
      const compressedBlob = await response.blob();
      
      // Validate blob before download
      if (!compressedBlob || compressedBlob.size === 0) {
        throw new Error('Compressed file is empty or corrupted');
      }
      
      setCompressedSize(compressedBlob.size);
      
      const downloadUrl = URL.createObjectURL(compressedBlob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'compressed-document.pdf';
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      // Clean up with proper delay
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
      }, 1000);
      
      console.log(`PDF compressed: ${formatFileSize(originalSize)} → ${formatFileSize(compressedBlob.size)} (${Math.round(((originalSize - compressedBlob.size) / originalSize) * 100)}% reduction)`);
      setStep(4); // Success step
      
    } catch (error) {
      console.error('Error compressing PDF:', error);
      setError(handleApiError(error));
      setStep(2); // Go back to selection
    } finally {
      setProcessing(false);
    }
  };

  // Step 1: Choose PDF File (if no file)
  if (!file) {
    return (
      <div className="min-h-screen bg-transparent p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-black/40 backdrop-blur-xl border border-gray-600/30 shadow-2xl mb-6">
              <Package className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-white mb-3">Compress PDF</h2>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              Reduce file size while maintaining document quality
            </p>
          </div>

          {/* Main Content */}
          <div className="bg-black/20 backdrop-blur-xl border border-gray-600/20 rounded-2xl p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-black/30 mb-6">
                <Package className="w-8 h-8 text-white" />
              </div>
              
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="compress-upload"
              />
              <label 
                htmlFor="compress-upload" 
                className="inline-flex items-center px-8 py-4 rounded-xl text-white font-medium transition-all duration-300 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 shadow-xl hover:shadow-2xl hover:scale-105 cursor-pointer mb-8"
              >
                <FileText className="w-5 h-5 mr-2" />
                Choose PDF File
              </label>
              
              {/* Error Display */}
              {error && (
                <ErrorDisplay 
                  error={error}
                  title="File Selection Error"
                  onDismiss={() => setError(null)}
                  className="mb-6"
                />
              )}
              
              <div className="bg-black/30 backdrop-blur-xl border border-gray-600/30 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-3">Compression Process</h3>
                <div className="space-y-2 text-gray-300 text-sm">
                  <p>• Upload your PDF document</p>
                  <p>• Select compression level</p>
                  <p>• Download optimized file</p>
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
        {/* Progress Steps */}
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 1 ? 'bg-slate-600' : 'bg-black/20'} border ${step >= 1 ? 'border-slate-500' : 'border-gray-600/30'} text-white font-bold backdrop-blur-xl`}>
              {step > 1 ? <Check className="w-5 h-5" /> : '1'}
            </div>
            <div className={`w-16 h-1 ${step >= 2 ? 'bg-slate-600' : 'bg-gray-600/30'} rounded`}></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 2 ? 'bg-slate-600' : 'bg-black/20'} border ${step >= 2 ? 'border-slate-500' : 'border-gray-600/30'} text-white font-bold backdrop-blur-xl`}>
              {step > 2 ? <Check className="w-5 h-5" /> : '2'}
            </div>
            <div className={`w-16 h-1 ${step >= 3 ? 'bg-slate-600' : 'bg-gray-600/30'} rounded`}></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 3 ? 'bg-slate-600' : 'bg-black/20'} border ${step >= 3 ? 'border-slate-500' : 'border-gray-600/30'} text-white font-bold backdrop-blur-xl`}>
              {step > 3 ? <Check className="w-5 h-5" /> : '3'}
            </div>
          </div>
        </div>

        {/* Step 2: Choose Compression Level */}
        {step === 2 && (
          <div className="space-y-8">
            <div className="bg-black/20 backdrop-blur-xl border border-gray-600/20 rounded-2xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-3">
                  Select Compression Level
                </h2>
                <p className="text-white/80 text-lg">
                  Choose the optimal balance between file size and quality
                </p>
                <div className="mt-6 inline-flex items-center gap-6 bg-black/30 backdrop-blur-xl border border-gray-600/20 px-8 py-4 rounded-xl">
                  <span className="text-white font-medium">
                    {file.name}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-white font-medium">
                    {formatFileSize(originalSize)}
                  </span>
                </div>
                
                {/* Error Display */}
                {error && (
                  <ErrorDisplay 
                    error={error}
                    title="Compression Failed"
                    onDismiss={() => setError(null)}
                    className="mt-6"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {compressionOptions.map((option) => (
                  <div 
                    key={option.level}
                    className={`
                      cursor-pointer transition-all transform hover:scale-105 border-2 rounded-xl p-6 text-center bg-black/20 backdrop-blur-xl
                      ${compressionLevel === option.level 
                        ? 'border-slate-500 bg-slate-600/20 ring-2 ring-slate-400/50' 
                        : 'border-gray-600/30 hover:border-gray-500/50'
                      }
                    `}
                    onClick={() => setCompressionLevel(option.level)}
                  >
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-r ${option.color} shadow-xl mb-4`}>
                      <div className="text-white">
                        {option.icon}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{option.name}</h3>
                    <p className="text-gray-400 text-sm mb-3">{option.description}</p>
                    <div className="text-lg font-bold text-gray-200">{option.reduction}</div>
                    
                    {compressionLevel === option.level && (
                      <div className="mt-3 inline-flex items-center text-slate-300 font-semibold">
                        <Check className="w-4 h-4 mr-1" />
                        Selected
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="text-center">
                <button 
                  onClick={handleCompress}
                  disabled={processing}
                  className="inline-flex items-center px-8 py-4 rounded-xl text-white font-medium transition-all duration-300 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 shadow-xl hover:shadow-2xl hover:scale-105 disabled:opacity-50"
                >
                  <Package className="w-5 h-5 mr-2" />
                  Compress PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Processing */}
        {step === 3 && (
          <div className="bg-black/20 backdrop-blur-xl border border-gray-600/20 rounded-2xl p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-white mb-6"></div>
            <h2 className="text-3xl font-bold text-white mb-4">Processing...</h2>
            <p className="text-xl text-gray-400">
              Optimizing file size with {compressionOptions.find(o => o.level === compressionLevel)?.name.toLowerCase()}
            </p>
            <div className="mt-4 text-lg font-semibold text-gray-300">
              Expected reduction: {compressionOptions.find(o => o.level === compressionLevel)?.reduction}
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="bg-black/20 backdrop-blur-xl border border-gray-600/20 rounded-2xl p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-600 text-white mb-6">
              <Check className="w-8 h-8" />
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">Compression Complete!</h2>
            <p className="text-xl text-gray-400 mb-8">
              Your optimized PDF has been downloaded successfully.
            </p>
            {compressedSize > 0 && (
              <div className="mb-8 p-6 bg-black/30 backdrop-blur-xl border border-gray-600/20 rounded-xl">
                <div className="text-lg font-semibold text-white mb-4">Compression Results:</div>
                <div className="flex items-center justify-center gap-8 text-center">
                  <div>
                    <div className="text-sm text-gray-400">Original Size</div>
                    <div className="text-lg font-bold text-gray-200">{formatFileSize(originalSize)}</div>
                  </div>
                  <div>
                    <div className="text-4xl text-gray-500">→</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Compressed Size</div>
                    <div className="text-lg font-bold text-gray-200">{formatFileSize(compressedSize)}</div>
                  </div>
                </div>
                <div className="text-center mt-4">
                  <span className="text-lg font-bold text-white">
                    {originalSize > compressedSize 
                      ? `${Math.round(((originalSize - compressedSize) / originalSize) * 100)}% smaller`
                      : 'No size reduction'
                    }
                  </span>
                </div>
              </div>
            )}
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => {
                  setStep(2);
                  setProcessing(false);
                }}
                className="inline-flex items-center px-8 py-3 rounded-xl text-white font-medium transition-all duration-300 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 shadow-xl hover:shadow-2xl hover:scale-105"
              >
                <Package className="w-5 h-5 mr-2" />
                Compress Another PDF
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="px-8 py-3 rounded-xl bg-black/30 text-white hover:bg-black/50 border border-gray-600/30 hover:border-gray-500/50 transition-all duration-200"
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

export default CompressPDFTool;