import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CloudArrowUpIcon, 
  DocumentTextIcon, 
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import { toast } from 'sonner';

interface FileUploadProps {
  onFileUploaded?: (data: any) => void;
  onError?: (error: string) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  multiple?: boolean;
  uploadType?: 'resume' | 'cover-letter' | 'general';
}

interface UploadedFile {
  file: File;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  data?: any;
  error?: string;
}

export default function FileUpload({
  onFileUploaded,
  onError,
  accept = {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/plain': ['.txt']
  },
  maxSize = 10 * 1024 * 1024, // 10MB
  multiple = false,
  uploadType = 'general'
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const uploadFile = async (file: File) => {
    const fileId = Date.now().toString();
    
    // Add file to state with uploading status
    const newFile: UploadedFile = {
      file,
      status: 'uploading',
      progress: 0
    };
    
    setUploadedFiles(prev => [...prev, newFile]);

    try {
      let response;
      
      if (uploadType === 'resume') {
        // First upload, then parse
        const formData = new FormData();
        formData.append('resume', file);
        response = await api.post('/upload/resume', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        // Simulate progress
        for (let i = 0; i <= 100; i += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          setUploadedFiles(prev => 
            prev.map(f => 
              f.file === file ? { ...f, progress: i } : f
            )
          );
        }
        
        // Parse the uploaded resume
        const parseFormData = new FormData();
        parseFormData.append('resume', file);
        const parseResponse = await api.post('/upload/parse', parseFormData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        setUploadedFiles(prev => 
          prev.map(f => 
            f.file === file 
              ? { 
                  ...f, 
                  status: 'success', 
                  progress: 100, 
                  data: parseResponse.data 
                }
              : f
          )
        );

        onFileUploaded?.(parseResponse.data);
        toast.success('Resume uploaded and parsed successfully!');
      } else {
        // Generic file upload
        const formData = new FormData();
        formData.append('resume', file);
        response = await api.post('/upload/resume', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }); // Using generic upload
        
        setUploadedFiles(prev => 
          prev.map(f => 
            f.file === file 
              ? { 
                  ...f, 
                  status: 'success', 
                  progress: 100, 
                  data: response.data 
                }
              : f
          )
        );

        onFileUploaded?.(response.data);
        toast.success('File uploaded successfully!');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Upload failed';
      
      setUploadedFiles(prev => 
        prev.map(f => 
          f.file === file 
            ? { 
                ...f, 
                status: 'error', 
                error: errorMessage 
              }
            : f
        )
      );

      onError?.(errorMessage);
      toast.error(errorMessage);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(uploadFile);
  }, [uploadFile]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple,
    disabled: uploadedFiles.some(f => f.status === 'uploading')
  });

  const removeFile = (file: File) => {
    setUploadedFiles(prev => prev.filter(f => f.file !== file));
  };

  const retryUpload = (file: File) => {
    uploadFile(file);
  };

  const getStatusIcon = (status: 'uploading' | 'success' | 'error') => {
    switch (status) {
      case 'uploading':
        return <ArrowPathIcon className="h-5 w-5 text-dark-accent animate-spin" />;
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-400" />;
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-400" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full animate-slide-up-soft">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
          ${isDragActive 
            ? 'border-dark-accent bg-dark-accent/10' 
            : isDragReject 
            ? 'border-red-400 bg-red-500/10' 
            : 'border-surface-200 hover:border-dark-accent hover:bg-dark-accent/10'
          }
        `}
      >
        <input {...getInputProps()} />
        
        <motion.div
          animate={{ y: isDragActive ? -5 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <CloudArrowUpIcon className={`
            h-12 w-12 mx-auto mb-4 
            ${isDragActive ? 'text-dark-accent' : 'text-dark-text-muted'}
          `} />
          
          <div className="space-y-2">
            <p className="text-lg font-medium text-text-primary">
              {isDragActive 
                ? 'Drop your files here!' 
                : 'Drag & drop files here, or click to browse'
              }
            </p>
            <p className="text-sm text-text-secondary">
              Supports PDF, DOC, DOCX, TXT files up to {formatFileSize(maxSize)}
            </p>
          </div>
        </motion.div>

        {uploadedFiles.some(f => f.status === 'uploading') && (
          <div className="absolute inset-0 bg-gray-700/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-dark-accent border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-text-secondary">Uploading...</p>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded Files */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 space-y-3"
          >
            {uploadedFiles.map((uploadedFile, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="card-dark border border-surface-200 rounded-lg p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <DocumentTextIcon className="h-8 w-8 text-dark-text-muted" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {uploadedFile.file.name}
                      </p>
                      <p className="text-xs text-dark-text-muted">
                        {formatFileSize(uploadedFile.file.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {getStatusIcon(uploadedFile.status)}
                    
                    {uploadedFile.status === 'error' && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => retryUpload(uploadedFile.file)}
                        className="text-dark-accent hover:text-dark-accent/80 text-sm font-medium"
                      >
                        Retry
                      </motion.button>
                    )}
                    
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removeFile(uploadedFile.file)}
                      className="text-dark-text-muted hover:text-red-400"
                    >
                      <XCircleIcon className="h-5 w-5" />
                    </motion.button>
                  </div>
                </div>

                {/* Progress Bar */}
                {uploadedFile.status === 'uploading' && (
                  <div className="mt-3">
                    <div className="bg-surface-50/20 rounded-full h-2">
                      <motion.div
                        className="bg-dark-accent rounded-full h-2"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadedFile.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="text-xs text-dark-text-muted mt-1">
                      {uploadedFile.progress}% uploaded
                    </p>
                  </div>
                )}

                {/* Error Message */}
                {uploadedFile.status === 'error' && uploadedFile.error && (
                  <p className="text-sm text-red-400 mt-2">
                    {uploadedFile.error}
                  </p>
                )}

                {/* Success Data Preview */}
                {uploadedFile.status === 'success' && uploadedFile.data && (
                  <div className="mt-3 p-3 bg-green-500/10 border border-green-400/30 rounded-lg">
                    <p className="text-sm text-green-400">
                      ✅ File processed successfully
                    </p>
                    {uploadType === 'resume' && uploadedFile.data.personalInfo && (
                      <p className="text-xs text-green-400/80 mt-1">
                        Extracted: {uploadedFile.data.personalInfo.firstName} {uploadedFile.data.personalInfo.lastName}
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
