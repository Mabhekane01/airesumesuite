import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon, DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { api } from '../../services/api';
import { ResumeData } from '../../services/resumeService';
import { toast } from 'sonner';

interface FileUploadProps {
  onUpload: (data: ResumeData) => void;
}

export function FileUpload({ onUpload }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const response = await api.post('/upload/resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        },
      });

      if (response.data.success) {
        const extractedData = response.data.data.parsedData;
        
        // Add a default title and other required fields
        const resumeData: ResumeData = {
          title: `Imported Resume - ${new Date().toLocaleDateString()}`,
          ...extractedData,
          templateId: 'modern-1',
          isPublic: false,
        };

        onUpload(resumeData);
        toast.success('Resume uploaded and parsed successfully!');
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      
      let errorMessage = 'Failed to upload and parse resume';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      uploadFile(file);
    }
  }, [uploadFile]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isUploading,
  });

  const fileRejectionItems = fileRejections.map(({ file, errors }) => (
    <li key={file.name} className="text-sm text-red-400">
      {file.name} - {errors.map(e => e.message).join(', ')}
    </li>
  ));

  return (
    <div className="space-y-4 animate-slide-up-soft">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-dark-accent bg-dark-accent/10'
            : isUploading
            ? 'border-dark-border bg-gray-800/20 cursor-not-allowed'
            : 'border-dark-border hover:border-dark-accent hover:bg-dark-accent/10'
        }`}
      >
        <input {...getInputProps()} />
        
        {isUploading ? (
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 bg-dark-accent/20 rounded-full flex items-center justify-center">
              <CloudArrowUpIcon className="w-6 h-6 text-dark-accent animate-pulse" />
            </div>
            <div>
              <p className="text-lg font-medium text-dark-text-primary">Uploading and parsing...</p>
              <p className="text-sm text-dark-text-secondary">This may take a few moments</p>
            </div>
            <div className="w-full bg-gray-800/20 rounded-full h-2">
              <div
                className="bg-dark-accent h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-dark-text-secondary">{uploadProgress}% complete</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 bg-gray-800/20 rounded-full flex items-center justify-center">
              {isDragActive ? (
                <CloudArrowUpIcon className="w-6 h-6 text-dark-accent" />
              ) : (
                <DocumentTextIcon className="w-6 h-6 text-dark-text-muted" />
              )}
            </div>
            <div>
              <p className="text-lg font-medium text-dark-text-primary">
                {isDragActive ? 'Drop your resume here' : 'Upload your resume'}
              </p>
              <p className="text-sm text-dark-text-secondary">
                Drag and drop your file here, or{' '}
                <span className="text-dark-accent hover:text-dark-accent/80 font-medium">
                  browse to upload
                </span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* File Type Info */}
      <div className="glass-dark rounded-lg p-4 border border-dark-border">
        <h4 className="text-sm font-medium text-dark-text-primary mb-2">Supported file types:</h4>
        <ul className="text-sm text-dark-text-secondary space-y-1">
          <li>• PDF files (.pdf)</li>
          <li>• Microsoft Word documents (.doc, .docx)</li>
          <li>• Maximum file size: 10MB</li>
        </ul>
      </div>

      {/* Error Messages */}
      {fileRejections.length > 0 && (
        <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <XMarkIcon className="w-5 h-5 text-red-400" />
            <h4 className="text-sm font-medium text-red-400">Upload Error</h4>
          </div>
          <ul className="space-y-1">{fileRejectionItems}</ul>
        </div>
      )}
    </div>
  );
}