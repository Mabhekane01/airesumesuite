import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { 
  FileSignature, Shield, Users, Clock, Share2, Lock, Key,
  CheckSquare, Square, Circle, Type, Calendar, Upload,
  User, UserCheck, MessageCircle, Bell, Settings, Eye,
  Download, Printer, Mail, Database, Cloud, Zap,
  Award, Briefcase, Building, CreditCard, Globe
} from 'lucide-react';
import { clsx } from 'clsx';

interface DigitalSignature {
  id: string;
  signerName: string;
  signerEmail: string;
  signatureImage?: string;
  signatureText?: string;
  timestamp: Date;
  ipAddress?: string;
  certificate?: string;
  isValid: boolean;
  type: 'drawn' | 'typed' | 'uploaded' | 'certificate';
}

interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'checkbox' | 'radio' | 'dropdown' | 'date' | 'email' | 'number';
  label: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  validation?: string;
  options?: string[];
  defaultValue?: any;
  tooltip?: string;
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

interface Comment {
  id: string;
  userId: string;
  content: string;
  x: number;
  y: number;
  pageNumber: number;
  timestamp: Date;
  status: 'open' | 'resolved' | 'dismissed';
  replies: Comment[];
}

interface Approval {
  id: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  timestamp: Date;
}

interface EnterpriseDocument {
  id: string;
  title: string;
  version: number;
  status: 'draft' | 'review' | 'approved' | 'published' | 'archived';
  owner: CollaborativeUser;
  collaborators: CollaborativeUser[];
  signatures: DigitalSignature[];
  formFields: FormField[];
  comments: Comment[];
  approvals: Approval[];
  permissions: {
    requireApproval: boolean;
    allowAnonymousAccess: boolean;
    expireAccess?: Date;
    downloadRestrictions: boolean;
    watermarkRequired: boolean;
  };
  auditLog: any[];
  created: Date;
  lastModified: Date;
}

interface EnterpriseFeaturesProps {
  document: EnterpriseDocument;
  currentUser: CollaborativeUser;
  onDocumentUpdate: (document: EnterpriseDocument) => void;
  onSignatureAdd: (signature: DigitalSignature) => void;
  onFormFieldAdd: (field: FormField) => void;
  onCommentAdd: (comment: Comment) => void;
  onApprovalRequest: (approvers: string[]) => void;
}

export default function EnterpriseFeatures({
  document,
  currentUser,
  onDocumentUpdate,
  onSignatureAdd,
  onFormFieldAdd,
  onCommentAdd,
  onApprovalRequest
}: EnterpriseFeaturesProps) {
  const [activeFeature, setActiveFeature] = useState<'signatures' | 'forms' | 'collaboration' | 'approval' | 'security' | null>(null);
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type' | 'upload' | 'certificate'>('draw');
  const [formFieldType, setFormFieldType] = useState<FormField['type']>('text');
  const [showComments, setShowComments] = useState(false);
  const [selectedComment, setSelectedComment] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');

  const signaturePadRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Digital Signature Functions
  const handleDrawSignature = useCallback(() => {
    const canvas = signaturePadRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    let isDrawing = false;

    const startDrawing = (e: MouseEvent) => {
      isDrawing = true;
      ctx.beginPath();
      ctx.moveTo(e.offsetX, e.offsetY);
    };

    const draw = (e: MouseEvent) => {
      if (!isDrawing) return;
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
    };

    const stopDrawing = () => {
      isDrawing = false;
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
    };
  }, []);

  const saveSignature = () => {
    const canvas = signaturePadRef.current;
    if (!canvas) return;

    const signatureData = canvas.toDataURL('image/png');
    const newSignature: DigitalSignature = {
      id: `sig-${Date.now()}`,
      signerName: currentUser.name,
      signerEmail: currentUser.email,
      signatureImage: signatureData,
      timestamp: new Date(),
      isValid: true,
      type: 'drawn'
    };

    onSignatureAdd(newSignature);
    setActiveFeature(null);
  };

  const clearSignature = () => {
    const canvas = signaturePadRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Form Field Functions
  const createFormField = (type: FormField['type']) => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      name: `field_${Date.now()}`,
      x: 100,
      y: 100,
      width: type === 'checkbox' || type === 'radio' ? 20 : 200,
      height: type === 'textarea' ? 100 : 30,
      required: false
    };

    if (type === 'dropdown' || type === 'radio') {
      newField.options = ['Option 1', 'Option 2', 'Option 3'];
    }

    onFormFieldAdd(newField);
    setActiveFeature(null);
  };

  // Collaboration Functions
  const addComment = (x: number, y: number, pageNumber: number) => {
    if (!commentDraft.trim()) return;

    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      userId: currentUser.id,
      content: commentDraft,
      x,
      y,
      pageNumber,
      timestamp: new Date(),
      status: 'open',
      replies: []
    };

    onCommentAdd(newComment);
    setCommentDraft('');
  };

  const requestApproval = () => {
    const approvers = document.collaborators
      .filter(user => user.permissions.approve)
      .map(user => user.id);
    
    onApprovalRequest(approvers);
  };

  // Render different feature panels
  const renderSignaturePanel = () => (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileSignature className="text-blue-600" />
          Digital Signatures
        </h3>

        {/* Signature Mode Selection */}
        <div className="mb-6">
          <div className="flex gap-2 mb-4">
            <Button
              size="sm"
              variant={signatureMode === 'draw' ? 'primary' : 'outline'}
              onClick={() => setSignatureMode('draw')}
            >
              Draw Signature
            </Button>
            <Button
              size="sm"
              variant={signatureMode === 'type' ? 'primary' : 'outline'}
              onClick={() => setSignatureMode('type')}
            >
              Type Signature
            </Button>
            <Button
              size="sm"
              variant={signatureMode === 'upload' ? 'primary' : 'outline'}
              onClick={() => setSignatureMode('upload')}
            >
              Upload Image
            </Button>
            <Button
              size="sm"
              variant={signatureMode === 'certificate' ? 'primary' : 'outline'}
              onClick={() => setSignatureMode('certificate')}
            >
              Digital Certificate
            </Button>
          </div>

          {signatureMode === 'draw' && (
            <div>
              <canvas
                ref={signaturePadRef}
                width={400}
                height={150}
                className="border border-gray-300 rounded cursor-crosshair bg-white"
                onMouseEnter={handleDrawSignature}
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={clearSignature}>Clear</Button>
                <Button size="sm" onClick={saveSignature} className="bg-blue-600 hover:bg-blue-700">
                  Save Signature
                </Button>
              </div>
            </div>
          )}

          {signatureMode === 'type' && (
            <div>
              <input
                type="text"
                placeholder="Type your name"
                className="w-full p-2 border border-gray-300 rounded mb-2"
                style={{ fontFamily: 'Brush Script MT, cursive', fontSize: '24px' }}
              />
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                Create Signature
              </Button>
            </div>
          )}

          {signatureMode === 'upload' && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
              />
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Upload size={16} className="mr-2" />
                Upload Signature Image
              </Button>
            </div>
          )}

          {signatureMode === 'certificate' && (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded">
              <Award className="mx-auto mb-2 text-gray-400" size={48} />
              <p className="text-gray-600 mb-4">Digital Certificate Signing</p>
              <Button className="bg-green-600 hover:bg-green-700">
                <Shield size={16} className="mr-2" />
                Sign with Certificate
              </Button>
            </div>
          )}
        </div>

        {/* Existing Signatures */}
        {document.signatures.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Document Signatures</h4>
            <div className="space-y-2">
              {document.signatures.map(sig => (
                <div key={sig.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                  <UserCheck className="text-green-600" size={16} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{sig.signerName}</p>
                    <p className="text-xs text-gray-600">
                      Signed on {sig.timestamp.toLocaleDateString()}
                    </p>
                  </div>
                  <div className={clsx(
                    'w-2 h-2 rounded-full',
                    sig.isValid ? 'bg-green-500' : 'bg-red-500'
                  )} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );

  const renderFormsPanel = () => (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CheckSquare className="text-purple-600" />
          Interactive Forms
        </h3>

        <div className="grid grid-cols-2 gap-2 mb-6">
          <Button
            size="sm"
            variant="outline"
            onClick={() => createFormField('text')}
            className="justify-start"
          >
            <Type size={16} className="mr-2" />
            Text Field
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => createFormField('textarea')}
            className="justify-start"
          >
            <Type size={16} className="mr-2" />
            Text Area
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => createFormField('checkbox')}
            className="justify-start"
          >
            <CheckSquare size={16} className="mr-2" />
            Checkbox
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => createFormField('radio')}
            className="justify-start"
          >
            <Circle size={16} className="mr-2" />
            Radio Button
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => createFormField('dropdown')}
            className="justify-start"
          >
            <Square size={16} className="mr-2" />
            Dropdown
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => createFormField('date')}
            className="justify-start"
          >
            <Calendar size={16} className="mr-2" />
            Date Picker
          </Button>
        </div>

        {document.formFields.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Form Fields ({document.formFields.length})</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {document.formFields.map(field => (
                <div key={field.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                  <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                    {field.type === 'text' && <Type size={14} />}
                    {field.type === 'checkbox' && <CheckSquare size={14} />}
                    {field.type === 'dropdown' && <Square size={14} />}
                    {field.type === 'date' && <Calendar size={14} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{field.label}</p>
                    <p className="text-xs text-gray-600">
                      {field.type} • {field.required ? 'Required' : 'Optional'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );

  const renderCollaborationPanel = () => (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="text-green-600" />
          Collaboration
        </h3>

        {/* Active Collaborators */}
        <div className="mb-6">
          <h4 className="font-medium mb-2">Active Collaborators</h4>
          <div className="space-y-2">
            {document.collaborators.map(user => (
              <div key={user.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                <div className="relative">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <User className="text-white" size={14} />
                    </div>
                  )}
                  <div className={clsx(
                    'absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white',
                    user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                  )} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-gray-600">{user.role}</p>
                </div>
                {user.isOnline && (
                  <div className="text-xs text-green-600">Online</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Comments */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">Comments ({document.comments.length})</h4>
            <Button
              size="sm"
              variant={showComments ? 'primary' : 'outline'}
              onClick={() => setShowComments(!showComments)}
            >
              <MessageCircle size={16} />
            </Button>
          </div>
          
          {showComments && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {document.comments.map(comment => (
                <div key={comment.id} className="p-2 bg-yellow-50 border-l-2 border-yellow-400 rounded">
                  <div className="flex items-center gap-2 mb-1">
                    <User size={12} className="text-gray-600" />
                    <span className="text-sm font-medium">
                      {document.collaborators.find(u => u.id === comment.userId)?.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {comment.timestamp.toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Share Options */}
        <div>
          <Button className="w-full bg-blue-600 hover:bg-blue-700">
            <Share2 size={16} className="mr-2" />
            Share Document
          </Button>
        </div>
      </div>
    </Card>
  );

  const renderApprovalPanel = () => (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Award className="text-orange-600" />
          Approval Workflow
        </h3>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Document Status</span>
            <span className={clsx(
              'px-2 py-1 text-xs rounded-full',
              document.status === 'draft' && 'bg-gray-100 text-gray-800',
              document.status === 'review' && 'bg-yellow-100 text-yellow-800',
              document.status === 'approved' && 'bg-green-100 text-green-800',
              document.status === 'published' && 'bg-blue-100 text-blue-800'
            )}>
              {document.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Approval Status */}
        {document.approvals.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium mb-2">Approval Status</h4>
            <div className="space-y-2">
              {document.approvals.map(approval => (
                <div key={approval.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                  <div className={clsx(
                    'w-2 h-2 rounded-full',
                    approval.status === 'approved' && 'bg-green-500',
                    approval.status === 'rejected' && 'bg-red-500',
                    approval.status === 'pending' && 'bg-yellow-500'
                  )} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {document.collaborators.find(u => u.id === approval.userId)?.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {approval.status === 'pending' ? 'Awaiting approval' : 
                       `${approval.status} on ${approval.timestamp.toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Button
            onClick={requestApproval}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            Request Approval
          </Button>
          {currentUser.permissions.approve && (
            <div className="flex gap-2">
              <Button className="flex-1 bg-green-600 hover:bg-green-700">
                Approve
              </Button>
              <Button variant="outline" className="flex-1">
                Request Changes
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  const renderSecurityPanel = () => (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="text-red-600" />
          Security & Permissions
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <p className="font-medium">Password Protection</p>
              <p className="text-sm text-gray-600">Require password to view document</p>
            </div>
            <Button size="sm" variant="outline">
              <Lock size={16} />
              Set Password
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <p className="font-medium">Digital Rights Management</p>
              <p className="text-sm text-gray-600">Control printing and copying</p>
            </div>
            <Button size="sm" variant="outline">
              <Key size={16} />
              Configure DRM
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <p className="font-medium">Access Expiration</p>
              <p className="text-sm text-gray-600">Set document expiration date</p>
            </div>
            <Button size="sm" variant="outline">
              <Clock size={16} />
              Set Expiry
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <p className="font-medium">Watermarking</p>
              <p className="text-sm text-gray-600">Add security watermarks</p>
            </div>
            <Button size="sm" variant="outline">
              Add Watermark
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <p className="font-medium">Audit Trail</p>
              <p className="text-sm text-gray-600">Track all document activities</p>
            </div>
            <Button size="sm" variant="outline">
              <Eye size={16} />
              View Audit Log
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="bg-gray-50 border-t border-gray-200">
      {/* Enterprise Feature Tabs */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-1">
          <Button
            size="sm"
            variant={activeFeature === 'signatures' ? 'primary' : 'outline'}
            onClick={() => setActiveFeature(activeFeature === 'signatures' ? null : 'signatures')}
          >
            <FileSignature size={16} className="mr-1" />
            Signatures
          </Button>
          <Button
            size="sm"
            variant={activeFeature === 'forms' ? 'primary' : 'outline'}
            onClick={() => setActiveFeature(activeFeature === 'forms' ? null : 'forms')}
          >
            <CheckSquare size={16} className="mr-1" />
            Forms
          </Button>
          <Button
            size="sm"
            variant={activeFeature === 'collaboration' ? 'primary' : 'outline'}
            onClick={() => setActiveFeature(activeFeature === 'collaboration' ? null : 'collaboration')}
          >
            <Users size={16} className="mr-1" />
            Collaborate
          </Button>
          <Button
            size="sm"
            variant={activeFeature === 'approval' ? 'primary' : 'outline'}
            onClick={() => setActiveFeature(activeFeature === 'approval' ? null : 'approval')}
          >
            <Award size={16} className="mr-1" />
            Approvals
          </Button>
          <Button
            size="sm"
            variant={activeFeature === 'security' ? 'primary' : 'outline'}
            onClick={() => setActiveFeature(activeFeature === 'security' ? null : 'security')}
          >
            <Shield size={16} className="mr-1" />
            Security
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-sm text-gray-600">
            <Building size={14} />
            <span>Enterprise Edition</span>
          </div>
          {document.collaborators.filter(u => u.isOnline).length > 0 && (
            <div className="flex items-center space-x-1 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>{document.collaborators.filter(u => u.isOnline).length} online</span>
            </div>
          )}
        </div>
      </div>

      {/* Feature Panels */}
      {activeFeature && (
        <div className="p-4">
          <div className="max-w-2xl mx-auto">
            {activeFeature === 'signatures' && renderSignaturePanel()}
            {activeFeature === 'forms' && renderFormsPanel()}
            {activeFeature === 'collaboration' && renderCollaborationPanel()}
            {activeFeature === 'approval' && renderApprovalPanel()}
            {activeFeature === 'security' && renderSecurityPanel()}
          </div>
        </div>
      )}
    </div>
  );
}
