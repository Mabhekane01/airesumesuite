import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '../ui/Button';
import { 
  Upload, Save, Download, Type, Highlighter, MousePointer, 
  Hand, ZoomIn, ZoomOut, RotateCw, Move, Trash2, Edit3
} from 'lucide-react';
import { clsx } from 'clsx';
import ErrorDisplay from './ErrorDisplay';
import { parseApiError, handleApiError, validatePdfFile } from './utils/errorUtils';
import RealTimeEditingEngine from './RealTimeEditingEngine';
import ProfessionalToolbar from './ProfessionalToolbar';
import EnterpriseFeatures from './EnterpriseFeatures';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// Types for the 3-step architecture
interface UploadedPDF {
  fileId: string;
  fileName: string;
  numPages: number;
  previewUrl?: string;
}

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

interface PDFFile {
  file: File;
  preview?: string;
  pages?: number;
}

interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  fontStyle: 'normal' | 'italic' | 'oblique';
  textDecoration: string[];
  color: string;
  backgroundColor: string;
  lineHeight: number;
  letterSpacing: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

interface CollaborativeUser {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'editor' | 'reviewer' | 'viewer';
  avatar?: string;
  lastActive: Date;
  isOnline: boolean;
  permissions: {
    edit: boolean;
    comment: boolean;
    approve: boolean;
    download: boolean;
    share: boolean;
  };
}

export default function AdvancedPDFEditor() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [activeFile, setActiveFile] = useState<PDFFile | null>(null);
  const [editorMode, setEditorMode] = useState<'basic' | 'professional' | 'enterprise'>('professional');
  const [isProcessing, setIsProcessing] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [showGrid, setShowGrid] = useState(false);
  const [showRulers, setShowRulers] = useState(false);
  const [selectedElements, setSelectedElements] = useState<any[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  // Text styling state
  const [currentStyle, setCurrentStyle] = useState<TextStyle>({
    fontFamily: 'Arial',
    fontSize: 14,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: [],
    color: '#000000',
    backgroundColor: 'transparent',
    lineHeight: 1.4,
    letterSpacing: 0,
    textAlign: 'left',
    textTransform: 'none'
  });

  // Enterprise document state
  const [enterpriseDocument, setEnterpriseDocument] = useState({
    id: 'doc-123',
    title: 'Advanced PDF Document',
    version: 1,
    status: 'draft' as const,
    owner: {
      id: 'user-1',
      name: 'Current User',
      email: 'user@example.com',
      role: 'owner' as const,
      lastActive: new Date(),
      isOnline: true,
      permissions: {
        edit: true,
        comment: true,
        approve: true,
        download: true,
        share: true
      }
    },
    collaborators: [] as CollaborativeUser[],
    signatures: [],
    formFields: [],
    comments: [],
    approvals: [],
    permissions: {
      requireApproval: false,
      allowAnonymousAccess: false,
      downloadRestrictions: false,
      watermarkRequired: false
    },
    auditLog: [],
    created: new Date(),
    lastModified: new Date()
  });

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

  const handleStyleChange = useCallback((updates: Partial<TextStyle>) => {
    setCurrentStyle(prev => ({ ...prev, ...updates }));
  }, []);

  const handleAction = useCallback((action: string, params?: any) => {
    console.log('Action:', action, params);
    
    switch (action) {
      case 'save':
        setIsProcessing(true);
        setTimeout(() => setIsProcessing(false), 2000);
        break;
      case 'undo':
        setCanRedo(true);
        setCanUndo(false);
        break;
      case 'redo':
        setCanUndo(true);
        setCanRedo(false);
        break;
      default:
        console.log('Unhandled action:', action);
    }
  }, []);

  const handleDocumentUpdate = useCallback((doc: any) => {
    setEnterpriseDocument(doc);
  }, []);

  const handleSignatureAdd = useCallback((signature: any) => {
    setEnterpriseDocument(prev => ({
      ...prev,
      signatures: [...prev.signatures, signature]
    }));
  }, []);

  const handleFormFieldAdd = useCallback((field: any) => {
    setEnterpriseDocument(prev => ({
      ...prev,
      formFields: [...prev.formFields, field]
    }));
  }, []);

  const handleCommentAdd = useCallback((comment: any) => {
    setEnterpriseDocument(prev => ({
      ...prev,
      comments: [...prev.comments, comment]
    }));
  }, []);

  const handleApprovalRequest = useCallback((approvers: string[]) => {
    console.log('Requesting approval from:', approvers);
  }, []);

  // Editor mode descriptions
  const editorModes = [
    {
      id: 'basic',
      name: 'Basic Editor',
      description: 'Simple PDF editing with essential tools',
      icon: FileText,
      color: 'from-blue-500 to-cyan-500',
      features: ['Text editing', 'Basic annotations', 'Page management']
    },
    {
      id: 'professional',
      name: 'Professional Editor',
      description: 'Advanced editing with professional tools',
      icon: Crown,
      color: 'from-emerald-500 to-pink-500',
      features: ['Word-level editing', 'Advanced formatting', 'Real-time preview', 'Professional tools']
    },
    {
      id: 'enterprise',
      name: 'Enterprise Suite',
      description: 'Complete solution with collaboration and security',
      icon: Building,
      color: 'from-emerald-500 to-teal-500',
      features: ['Digital signatures', 'Collaboration', 'Workflow approval', 'Security features', 'Audit trails']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10">
        {!activeFile ? (
          // File Upload and Mode Selection Screen
          <div className="min-h-screen flex flex-col items-center justify-center p-8">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-2xl shadow-purple-500/25 mb-8 animate-float">
                <Sparkles className="w-12 h-12 text-brand-dark" />
              </div>
              <h1 className="text-7xl font-bold mb-6">
                <span className="bg-gradient-to-r from-emerald-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient-x">
                  Enterprise PDF Studio
                </span>
              </h1>
              <p className="text-gray-300 text-2xl max-w-4xl mx-auto leading-relaxed mb-8">
                Professional PDF editing with advanced features - edit like never before with word-level precision, 
                real-time collaboration, and enterprise-grade security
              </p>
              
              {/* Feature Highlights */}
              <div className="flex justify-center space-x-8 mb-12">
                <div className="text-center">
                  <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mb-3 mx-auto">
                    <Zap className="w-8 h-8 text-teal-400" />
                  </div>
                  <p className="text-brand-dark font-medium">Real-time Editing</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-3 mx-auto">
                    <Users className="w-8 h-8 text-green-400" />
                  </div>
                  <p className="text-brand-dark font-medium">Collaboration</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-3 mx-auto">
                    <Shield className="w-8 h-8 text-emerald-400" />
                  </div>
                  <p className="text-brand-dark font-medium">Enterprise Security</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mb-3 mx-auto">
                    <FileSignature className="w-8 h-8 text-orange-400" />
                  </div>
                  <p className="text-brand-dark font-medium">Digital Signatures</p>
                </div>
              </div>
            </div>

            {/* Editor Mode Selection */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-brand-dark text-center mb-8">Choose Your Editing Experience</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl">
                {editorModes.map((mode) => (
                  <Card 
                    key={mode.id}
                    className={clsx(
                      'p-6 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:-translate-y-2',
                      editorMode === mode.id 
                        ? `bg-gradient-to-br ${mode.color} text-brand-dark shadow-2xl border-2 border-white/30` 
                        : 'glass-dark border border-white/10 text-gray-300 hover:bg-white/10'
                    )}
                    onClick={() => setEditorMode(mode.id as any)}
                  >
                    <div className="text-center">
                      <div className={clsx(
                        'w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center transition-all duration-300',
                        editorMode === mode.id 
                          ? 'bg-white/20 shadow-2xl' 
                          : 'bg-white/5 hover:bg-white/15'
                      )}>
                        <mode.icon size={32} />
                      </div>
                      <h3 className="text-xl font-bold mb-2">{mode.name}</h3>
                      <p className="text-sm opacity-90 mb-4">{mode.description}</p>
                      <div className="space-y-2">
                        {mode.features.map((feature, index) => (
                          <div key={index} className="flex items-center justify-center space-x-2">
                            <Star size={12} className="opacity-60" />
                            <span className="text-xs">{feature}</span>
                          </div>
                        ))}
                      </div>
                      {editorMode === mode.id && (
                        <div className="mt-4">
                          <div className="inline-flex items-center space-x-1 bg-white/20 px-3 py-1 rounded-full text-xs">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            <span>Selected</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* File Upload */}
            <div className="w-full max-w-2xl">
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="relative group border-2 border-dashed border-white/30 hover:border-accent-secondary rounded-3xl p-16 text-center transition-all duration-500 hover:bg-accent-secondary/5 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-accent-secondary/10 to-accent-primary/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="w-24 h-24 mx-auto mb-8 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Upload className="text-accent-secondary" size={48} />
                  </div>
                  <h3 className="text-white font-bold text-2xl mb-4">
                    Upload Your PDF Document
                  </h3>
                  <p className="text-gray-300 mb-8 text-lg">
                    Drag and drop your PDF files here, or click to browse
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                  <Button className="bg-gradient-to-r from-accent-secondary to-accent-primary hover:from-accent-primary hover:to-accent-secondary transform hover:scale-105 shadow-2xl px-8 py-3 text-lg">
                    <Upload size={20} className="mr-2" />
                    Choose PDF Files
                  </Button>
                  <p className="text-gray-400 text-sm mt-4">
                    Supports multiple files • Maximum 50MB per file • Secure processing
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Files */}
            {files.length > 0 && (
              <div className="w-full max-w-4xl mt-12">
                <h3 className="text-white font-semibold text-xl mb-6 text-center">Recent Uploads</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {files.slice(-6).map((file, index) => (
                    <Card 
                      key={index} 
                      className="p-4 glass-dark border border-white/10 hover:bg-white/10 cursor-pointer transform transition-all duration-300 hover:scale-105"
                      onClick={() => setActiveFile(file)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                          <FileText className="text-red-400" size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-brand-dark font-medium truncate">{file.file.name}</p>
                          <p className="text-gray-400 text-sm">
                            {(file.file.size / 1024 / 1024).toFixed(1)} MB • {file.file.lastModified ? new Date(file.file.lastModified).toLocaleDateString() : 'Unknown date'}
                          </p>
                        </div>
                        <Button size="sm" className="bg-accent-secondary hover:bg-accent-primary">
                          Edit
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Main Editor Interface
          <div className="h-screen flex flex-col bg-white">
            {/* Professional Toolbar */}
            <ProfessionalToolbar
              selectedElements={selectedElements}
              currentStyle={currentStyle}
              onStyleChange={handleStyleChange}
              onAction={handleAction}
              zoom={zoom}
              onZoomChange={setZoom}
              canUndo={canUndo}
              canRedo={canRedo}
              showGrid={showGrid}
              onToggleGrid={() => setShowGrid(!showGrid)}
              showRulers={showRulers}
              onToggleRulers={() => setShowRulers(!showRulers)}
            />

            {/* Editor Content */}
            <div className="flex-1 overflow-hidden">
              {editorMode === 'enterprise' ? (
                <RealTimeEditingEngine
                  file={activeFile.file}
                  onSave={(file) => console.log('File saved:', file)}
                  enableCollaboration={true}
                  autoSave={true}
                />
              ) : (
                <RealTimeEditingEngine
                  file={activeFile.file}
                  onSave={(file) => console.log('File saved:', file)}
                  enableCollaboration={editorMode === 'professional'}
                  autoSave={editorMode !== 'basic'}
                />
              )}
            </div>

            {/* Enterprise Features Panel */}
            {editorMode === 'enterprise' && (
              <EnterpriseFeatures
                document={enterpriseDocument}
                currentUser={enterpriseDocument.owner}
                onDocumentUpdate={handleDocumentUpdate}
                onSignatureAdd={handleSignatureAdd}
                onFormFieldAdd={handleFormFieldAdd}
                onCommentAdd={handleCommentAdd}
                onApprovalRequest={handleApprovalRequest}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
