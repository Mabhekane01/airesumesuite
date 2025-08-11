import React, { useState, useRef, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
  Upload, FileText, Edit3, PenTool, Download, RotateCw, Trash2, Split, Merge, Type, Image,
  Palette, Move, Square, Circle, Minus, Plus, Lock, Unlock, Eye, EyeOff, 
  Layers, MousePointer, Hand, Search, BookOpen, Settings, Shield, Sparkles,
  Wand2, Scissors, Copy, Stamp, FileImage, AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, Underline, Highlighter, Eraser, Grid, Ruler, ZoomIn, ZoomOut, Droplets
} from 'lucide-react';
import { clsx } from 'clsx';
import PDFViewer from './PDFViewer';
import SignaturePad from './SignaturePad';
import AdvancedToolbar from './AdvancedToolbar';
import PageThumbnails from './PageThumbnails';
import ImageEditor from './ImageEditor';
import FormFieldEditor from './FormFieldEditor';
import WatermarkEditor from './WatermarkEditor';
import SecurityOptimization from './SecurityOptimization';

interface PDFFile {
  file: File;
  preview?: string;
  pages?: number;
}

interface TextAnnotation {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  color: string;
  fontFamily: string;
}

interface SignatureAnnotation {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  imageData: string;
  type: 'image' | 'text';
  text?: string;
}

export default function PDFEditor() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [activeFile, setActiveFile] = useState<PDFFile | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'edit' | 'sign' | 'organize' | 'convert'>('upload');
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);
  const [signatures, setSignatures] = useState<SignatureAnnotation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [selectedTool, setSelectedTool] = useState<'select' | 'text' | 'draw' | 'image' | 'form'>('select');
  const [textStyle, setTextStyle] = useState({
    fontSize: 12,
    fontFamily: 'Helvetica',
    color: '#000000',
    bold: false,
    italic: false,
    underline: false
  });
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const [pages, setPages] = useState<any[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [formFields, setFormFields] = useState<any[]>([]);
  const [watermarks, setWatermarks] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [selectedWatermarkId, setSelectedWatermarkId] = useState<string | null>(null);
  const [documentInfo, setDocumentInfo] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((uploadedFiles: FileList | null) => {
    if (!uploadedFiles) return;

    const newFiles: PDFFile[] = Array.from(uploadedFiles)
      .filter(file => file.type === 'application/pdf')
      .map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));

    setFiles(prev => [...prev, ...newFiles]);
    if (newFiles.length > 0 && !activeFile) {
      setActiveFile(newFiles[0]);
      setActiveTab('edit');
    }
  }, [activeFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFiles = e.dataTransfer.files;
    handleFileUpload(droppedFiles);
  }, [handleFileUpload]);

  const extractText = async () => {
    if (!activeFile) return;
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('pdf', activeFile.file);

      const response = await fetch('/api/v1/pdf-editor/extract-text', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to extract text');
      const result = await response.json();
      console.log('Extracted text:', result);
    } catch (error) {
      console.error('Error extracting text:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const addTextAnnotation = async (text: string, x: number, y: number) => {
    if (!activeFile) return;
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('pdf', activeFile.file);
      formData.append('text', text);
      formData.append('x', x.toString());
      formData.append('y', y.toString());
      formData.append('fontSize', '12');
      formData.append('color', '#000000');

      const response = await fetch('/api/v1/pdf-editor/add-text', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to add text');
      const result = await response.blob();
      
      // Update the file with the modified PDF
      const newFile = new File([result], activeFile.file.name, { type: 'application/pdf' });
      const updatedFile = { ...activeFile, file: newFile };
      setActiveFile(updatedFile);
      setFiles(prev => prev.map(f => f === activeFile ? updatedFile : f));
    } catch (error) {
      console.error('Error adding text:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const addSignature = async (signatureData: string, x: number, y: number) => {
    if (!activeFile) return;
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('pdf', activeFile.file);
      formData.append('signatureImage', signatureData);
      formData.append('x', x.toString());
      formData.append('y', y.toString());

      const response = await fetch('/api/v1/pdf-editor/add-signature', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to add signature');
      const result = await response.blob();
      
      const newFile = new File([result], activeFile.file.name, { type: 'application/pdf' });
      const updatedFile = { ...activeFile, file: newFile };
      setActiveFile(updatedFile);
      setFiles(prev => prev.map(f => f === activeFile ? updatedFile : f));
    } catch (error) {
      console.error('Error adding signature:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const mergeFiles = async (filesToMerge: PDFFile[]) => {
    if (filesToMerge.length < 2) return;
    setIsProcessing(true);
    try {
      const formData = new FormData();
      filesToMerge.forEach(({ file }, index) => {
        formData.append(`pdf${index}`, file);
      });

      const response = await fetch('/api/v1/pdf-editor/merge', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to merge PDFs');
      const result = await response.blob();
      
      const mergedFile = new File([result], 'merged.pdf', { type: 'application/pdf' });
      const newPDFFile = { file: mergedFile, preview: URL.createObjectURL(result) };
      setFiles(prev => [...prev, newPDFFile]);
      setActiveFile(newPDFFile);
    } catch (error) {
      console.error('Error merging PDFs:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const convertToWord = async () => {
    if (!activeFile) return;
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('pdf', activeFile.file);

      const response = await fetch('/api/v1/pdf-editor/convert-to-word', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to convert PDF');
      const result = await response.blob();
      
      // Trigger download
      const url = URL.createObjectURL(result);
      const a = document.createElement('a');
      a.href = url;
      a.download = activeFile.file.name.replace('.pdf', '.docx');
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error converting PDF:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const tabs = [
    { id: 'upload', label: 'Upload', icon: Upload, color: 'from-blue-500 to-indigo-600', description: 'Upload and manage PDF files' },
    { id: 'edit', label: 'Edit', icon: Edit3, color: 'from-green-500 to-emerald-600', description: 'Edit text, images, and content' },
    { id: 'annotate', label: 'Annotate', icon: Highlighter, color: 'from-yellow-500 to-orange-600', description: 'Add highlights, notes, and drawings' },
    { id: 'sign', label: 'Sign', icon: PenTool, color: 'from-purple-500 to-violet-600', description: 'Digital signatures and certificates' },
    { id: 'forms', label: 'Forms', icon: Square, color: 'from-teal-500 to-cyan-600', description: 'Create and edit form fields' },
    { id: 'images', label: 'Images', icon: Image, color: 'from-pink-500 to-rose-600', description: 'Insert and edit images' },
    { id: 'watermark', label: 'Watermark', icon: Droplets, color: 'from-indigo-500 to-purple-600', description: 'Add watermarks and stamps' },
    { id: 'organize', label: 'Organize', icon: Layers, color: 'from-orange-500 to-red-600', description: 'Manage pages and structure' },
    { id: 'security', label: 'Security', icon: Shield, color: 'from-red-500 to-pink-600', description: 'Password protection and permissions' },
    { id: 'convert', label: 'Convert', icon: Download, color: 'from-cyan-500 to-blue-600', description: 'Convert to different formats' }
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 py-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 shadow-2xl shadow-purple-500/25 mb-6 animate-float">
            <FileText className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient-x">
              PDF Editor
            </span>
          </h1>
          <p className="text-gray-300 text-xl max-w-2xl mx-auto leading-relaxed">
            Professional PDF editing with advanced tools - edit, sign, merge, protect, and optimize your documents with ease
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="bg-black/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10 gap-3">
              {tabs.map(({ id, label, icon: Icon, color, description }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={clsx(
                    'group relative flex flex-col items-center gap-2 p-4 rounded-xl font-semibold transition-all duration-500 transform hover:scale-105 hover:-translate-y-1',
                    activeTab === id
                      ? `bg-gradient-to-br ${color} text-white shadow-2xl shadow-${color.split('-')[1]}-500/50 border border-white/30`
                      : 'text-gray-300 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/20 hover:shadow-xl'
                  )}
                  title={description}
                >
                  <div className={clsx(
                    'p-3 rounded-xl transition-all duration-300',
                    activeTab === id 
                      ? 'bg-white/20 shadow-2xl shadow-black/20' 
                      : 'bg-white/5 group-hover:bg-white/15'
                  )}>
                    <Icon size={24} />
                  </div>
                  <span className="text-xs font-medium text-center leading-tight">{label}</span>
                  {activeTab === id && (
                    <>
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/10 to-transparent animate-pulse" />
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full animate-bounce" />
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* File List */}
          <div className="xl:col-span-1">
            <Card>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Your PDFs</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      onClick={() => setActiveFile(file)}
                      className={clsx(
                        'p-3 rounded-lg cursor-pointer transition-all duration-300',
                        activeFile === file
                          ? 'bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20 border border-accent-primary/50'
                          : 'bg-dark-tertiary/60 hover:bg-dark-quaternary border border-dark-border hover:border-accent-primary/30'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="text-accent-primary" size={20} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {file.file.name}
                          </p>
                          <p className="text-xs text-dark-text-secondary">
                            {(file.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* PDF Viewer */}
          <div className="xl:col-span-3">
            {activeFile ? (
              <PDFViewer
                file={activeFile.file}
                onTextSelect={(text, x, y) => {
                  console.log('Text selected:', { text, x, y });
                }}
                onSignaturePlace={(x, y) => {
                  console.log('Signature placement:', { x, y });
                  setShowSignaturePad(true);
                }}
                annotations={[]}
              />
            ) : (
              <Card>
                <div className="p-6 h-[600px] flex items-center justify-center">
                  <div className="text-center">
                    <FileText className="mx-auto mb-4 text-dark-text-secondary" size={48} />
                    <p className="text-dark-text-secondary mb-4">
                      Select a PDF file to preview
                    </p>
                    <Button
                      onClick={() => setActiveTab('upload')}
                      variant="outline"
                    >
                      Upload PDF
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Tools Panel */}
          <div className="xl:col-span-1">
            {showSignaturePad ? (
              <SignaturePad
                onSave={(signatureData) => {
                  console.log('Signature saved:', signatureData);
                  setShowSignaturePad(false);
                }}
                onCancel={() => setShowSignaturePad(false)}
              />
            ) : (
              <div className="space-y-6">
                {/* Advanced Toolbar */}
                <AdvancedToolbar
                  selectedTool={selectedTool}
                  onToolSelect={setSelectedTool}
                  textStyle={textStyle}
                  onTextStyleChange={setTextStyle}
                />
                
                {/* Page Thumbnails */}
                <PageThumbnails
                  pages={pages}
                  onPageSelect={setSelectedPageId}
                  onPageDelete={(id) => setPages(pages.filter(p => p.id !== id))}
                  onPageRotate={(id) => console.log('Rotate page', id)}
                  onPageDuplicate={(id) => console.log('Duplicate page', id)}
                  onPageReorder={(from, to) => console.log('Reorder', from, to)}
                  onPageToggleVisibility={(id) => console.log('Toggle visibility', id)}
                  onPageToggleLock={(id) => console.log('Toggle lock', id)}
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
          <div className="xl:col-span-3">
            <div className="bg-black/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
              <div className="p-6">
                {activeTab === 'upload' && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4 shadow-2xl">
                        <Upload size={32} className="text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Upload PDF Files</h3>
                      <p className="text-gray-300">Drag and drop or browse to get started</p>
                    </div>
                    
                    <div
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      className="relative group border-2 border-dashed border-white/30 hover:border-blue-400 rounded-2xl p-12 text-center transition-all duration-500 hover:bg-blue-500/5"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-600/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="relative z-10">
                        <div className="w-20 h-20 mx-auto mb-6 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Upload className="text-blue-400" size={40} />
                        </div>
                        <p className="text-white font-semibold text-lg mb-2">
                          Drop PDF files here
                        </p>
                        <p className="text-gray-400 mb-6">
                          Supports multiple files, max 50MB each
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept=".pdf"
                          onChange={(e) => handleFileUpload(e.target.files)}
                          className="hidden"
                        />
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transform hover:scale-105 shadow-xl"
                        >
                          <Upload size={18} />
                          Browse Files
                        </Button>
                      </div>
                    </div>
                    
                    {files.length > 0 && (
                      <div className="bg-white/5 rounded-xl p-4">
                        <h4 className="text-white font-medium mb-3">Recent Uploads</h4>
                        <div className="space-y-2">
                          {files.slice(-3).map((file, index) => (
                            <div key={index} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                              <FileText size={16} className="text-blue-400" />
                              <span className="text-sm text-white flex-1">{file.file.name}</span>
                              <span className="text-xs text-gray-400">
                                {(file.file.size / 1024 / 1024).toFixed(1)}MB
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'edit' && activeFile && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-4 shadow-2xl">
                        <Edit3 size={32} className="text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Edit Content</h3>
                      <p className="text-gray-300">Modify text, images, and document structure</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button
                        onClick={extractText}
                        isLoading={isProcessing}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 h-auto flex-col gap-3 hover:shadow-xl transform hover:scale-105"
                      >
                        <Type size={32} />
                        <div className="text-center">
                          <div className="font-semibold">Extract Text</div>
                          <div className="text-sm opacity-80">Get editable text content</div>
                        </div>
                      </Button>
                      
                      <Button
                        onClick={() => addTextAnnotation('Sample Text', 100, 100)}
                        isLoading={isProcessing}
                        className="bg-gradient-to-r from-green-500 to-green-600 p-6 h-auto flex-col gap-3 hover:shadow-xl transform hover:scale-105"
                      >
                        <Plus size={32} />
                        <div className="text-center">
                          <div className="font-semibold">Add Text</div>
                          <div className="text-sm opacity-80">Insert new text anywhere</div>
                        </div>
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 border-purple-500/50 p-6 h-auto flex-col gap-3 hover:shadow-xl transform hover:scale-105"
                      >
                        <Search size={32} className="text-purple-400" />
                        <div className="text-center">
                          <div className="font-semibold text-white">Find & Replace</div>
                          <div className="text-sm text-gray-300">Search and replace text</div>
                        </div>
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-500/50 p-6 h-auto flex-col gap-3 hover:shadow-xl transform hover:scale-105"
                      >
                        <Wand2 size={32} className="text-yellow-400" />
                        <div className="text-center">
                          <div className="font-semibold text-white">OCR Text</div>
                          <div className="text-sm text-gray-300">Recognize text in images</div>
                        </div>
                      </Button>
                    </div>
                  </div>
                )}

                {activeTab === 'sign' && activeFile && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full mb-4 shadow-2xl">
                        <PenTool size={32} className="text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Digital Signatures</h3>
                      <p className="text-gray-300">Sign documents with legal validity</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button
                        onClick={() => setShowSignaturePad(true)}
                        className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 h-auto flex-col gap-3 hover:shadow-xl transform hover:scale-105"
                      >
                        <PenTool size={32} />
                        <div className="text-center">
                          <div className="font-semibold">Draw Signature</div>
                          <div className="text-sm opacity-80">Create signature with mouse/touch</div>
                        </div>
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-blue-500/50 p-6 h-auto flex-col gap-3 hover:shadow-xl transform hover:scale-105"
                      >
                        <Image size={32} className="text-blue-400" />
                        <div className="text-center">
                          <div className="font-semibold text-white">Upload Signature</div>
                          <div className="text-sm text-gray-300">Use existing signature image</div>
                        </div>
                      </Button>
                      
                      <Button
                        onClick={() => addSignature('data:image/png;base64,sample', 100, 200)}
                        isLoading={isProcessing}
                        className="bg-gradient-to-r from-green-500 to-green-600 p-6 h-auto flex-col gap-3 hover:shadow-xl transform hover:scale-105"
                      >
                        <Type size={32} />
                        <div className="text-center">
                          <div className="font-semibold">Text Signature</div>
                          <div className="text-sm opacity-80">Generate from typed text</div>
                        </div>
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-500/50 p-6 h-auto flex-col gap-3 hover:shadow-xl transform hover:scale-105"
                      >
                        <Shield size={32} className="text-yellow-400" />
                        <div className="text-center">
                          <div className="font-semibold text-white">Certificate</div>
                          <div className="text-sm text-gray-300">Digital certificate signing</div>
                        </div>
                      </Button>
                    </div>
                  </div>
                )}

                {activeTab === 'organize' && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full mb-4 shadow-2xl">
                        <Layers size={32} className="text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Organize Pages</h3>
                      <p className="text-gray-300">Manage document structure and layout</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button
                        onClick={() => mergeFiles(files.slice(0, 2))}
                        isLoading={isProcessing}
                        disabled={files.length < 2}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 h-auto flex-col gap-3 hover:shadow-xl transform hover:scale-105 disabled:opacity-50"
                      >
                        <Merge size={32} />
                        <div className="text-center">
                          <div className="font-semibold">Merge PDFs</div>
                          <div className="text-sm opacity-80">Combine multiple files</div>
                        </div>
                      </Button>
                      
                      <Button
                        className="bg-gradient-to-r from-green-500 to-green-600 p-6 h-auto flex-col gap-3 hover:shadow-xl transform hover:scale-105"
                      >
                        <Split size={32} />
                        <div className="text-center">
                          <div className="font-semibold">Split PDF</div>
                          <div className="text-sm opacity-80">Divide into separate files</div>
                        </div>
                      </Button>
                      
                      <Button
                        className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 h-auto flex-col gap-3 hover:shadow-xl transform hover:scale-105"
                      >
                        <RotateCw size={32} />
                        <div className="text-center">
                          <div className="font-semibold">Rotate Pages</div>
                          <div className="text-sm opacity-80">Fix page orientation</div>
                        </div>
                      </Button>
                      
                      <Button
                        className="bg-gradient-to-r from-red-500 to-red-600 p-6 h-auto flex-col gap-3 hover:shadow-xl transform hover:scale-105"
                      >
                        <Trash2 size={32} />
                        <div className="text-center">
                          <div className="font-semibold">Delete Pages</div>
                          <div className="text-sm opacity-80">Remove unwanted pages</div>
                        </div>
                      </Button>
                    </div>
                  </div>
                )}

                {activeTab === 'convert' && activeFile && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Convert PDF</h3>
                    <div className="space-y-4">
                      <Button
                        onClick={convertToWord}
                        isLoading={isProcessing}
                        variant="outline"
                        className="w-full"
                      >
                        <Download size={16} />
                        Convert to Word
                      </Button>
                      <div className="grid grid-cols-2 gap-4">
                        <Button variant="secondary">
                          Convert to Text
                        </Button>
                        <Button variant="secondary">
                          Convert to HTML
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {!activeFile && activeTab !== 'upload' && (
                  <div className="text-center py-12">
                    <FileText className="mx-auto mb-4 text-dark-text-secondary" size={48} />
                    <p className="text-dark-text-secondary">
                      Upload a PDF file to start editing
                    </p>
                    <Button
                      onClick={() => setActiveTab('upload')}
                      variant="outline"
                      className="mt-4"
                    >
                      Upload PDF
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}