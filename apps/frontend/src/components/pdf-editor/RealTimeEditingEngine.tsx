import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { 
  Play, Pause, Save, Undo, Redo, Eye, EyeOff, RefreshCw, Download,
  Layers, Grid, Ruler, MousePointer, Type, Edit3, Move, Hand,
  ZoomIn, ZoomOut, RotateCw, Settings, Share2, Clock, AlertCircle
} from 'lucide-react';
import { clsx } from 'clsx';
import AdvancedPDFCanvas from './AdvancedPDFCanvas';
import InteractiveTextEditor from './InteractiveTextEditor';

interface EditOperation {
  id: string;
  type: 'text' | 'move' | 'style' | 'add' | 'delete';
  timestamp: number;
  elementId: string;
  oldValue: any;
  newValue: any;
  userId?: string;
}

interface CollaborativeUser {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  isActive: boolean;
}

interface DocumentState {
  pages: any[];
  textElements: any[];
  annotations: any[];
  forms: any[];
  images: any[];
  version: number;
  lastModified: number;
  collaborators: CollaborativeUser[];
}

interface RealTimeEditingEngineProps {
  file: File;
  onSave?: (modifiedFile: File) => void;
  enableCollaboration?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number;
}

export default function RealTimeEditingEngine({
  file,
  onSave,
  enableCollaboration = false,
  autoSave = true,
  autoSaveInterval = 5000
}: RealTimeEditingEngineProps) {
  // Document state
  const [documentState, setDocumentState] = useState<DocumentState>({
    pages: [],
    textElements: [],
    annotations: [],
    forms: [],
    images: [],
    version: 1,
    lastModified: Date.now(),
    collaborators: []
  });

  // Editing state
  const [editHistory, setEditHistory] = useState<EditOperation[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number>(Date.now());

  // UI state
  const [currentTool, setCurrentTool] = useState<'select' | 'text' | 'annotate' | 'form' | 'image'>('select');
  const [zoom, setZoom] = useState(1.0);
  const [showGrid, setShowGrid] = useState(false);
  const [showRulers, setShowRulers] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set());

  // Real-time collaboration
  const [isConnected, setIsConnected] = useState(false);
  const [collaborativeUsers, setCollaborativeUsers] = useState<CollaborativeUser[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // Auto-save functionality
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastChangeRef = useRef<number>(Date.now());

  // Initialize WebSocket connection for collaboration
  useEffect(() => {
    if (enableCollaboration) {
      initializeCollaboration();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [enableCollaboration]);

  // Auto-save setup
  useEffect(() => {
    if (!autoSave) return;

    const interval = setInterval(() => {
      if (hasUnsavedChanges && Date.now() - lastChangeRef.current > autoSaveInterval) {
        performAutoSave();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [autoSave, autoSaveInterval, hasUnsavedChanges]);

  const initializeCollaboration = useCallback(() => {
    try {
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8080/pdf-collaboration';
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        console.log('Connected to collaboration server');
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleCollaborativeMessage(data);
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        console.log('Disconnected from collaboration server');
        // Attempt to reconnect
        setTimeout(() => initializeCollaboration(), 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('Collaboration connection error:', error);
      };
    } catch (error) {
      console.error('Failed to initialize collaboration:', error);
    }
  }, []);

  const handleCollaborativeMessage = (data: any) => {
    switch (data.type) {
      case 'operation':
        applyRemoteOperation(data.operation);
        break;
      case 'user_joined':
        setCollaborativeUsers(prev => [...prev, data.user]);
        break;
      case 'user_left':
        setCollaborativeUsers(prev => prev.filter(u => u.id !== data.userId));
        break;
      case 'cursor_update':
        updateUserCursor(data.userId, data.position);
        break;
    }
  };

  const broadcastOperation = (operation: EditOperation) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'operation',
        operation
      }));
    }
  };

  const applyRemoteOperation = (operation: EditOperation) => {
    // Apply operation from another user
    setDocumentState(prevState => {
      const newState = { ...prevState };
      
      switch (operation.type) {
        case 'text':
          newState.textElements = newState.textElements.map(el => 
            el.id === operation.elementId 
              ? { ...el, ...operation.newValue }
              : el
          );
          break;
        case 'move':
          newState.textElements = newState.textElements.map(el => 
            el.id === operation.elementId 
              ? { ...el, x: operation.newValue.x, y: operation.newValue.y }
              : el
          );
          break;
        case 'add':
          newState.textElements.push(operation.newValue);
          break;
        case 'delete':
          newState.textElements = newState.textElements.filter(el => el.id !== operation.elementId);
          break;
      }
      
      return { ...newState, version: newState.version + 1 };
    });
  };

  const createOperation = (
    type: EditOperation['type'], 
    elementId: string, 
    oldValue: any, 
    newValue: any
  ): EditOperation => {
    const operation: EditOperation = {
      id: `op-${Date.now()}-${Math.random()}`,
      type,
      timestamp: Date.now(),
      elementId,
      oldValue,
      newValue,
      userId: 'current-user' // In real app, get from auth
    };

    // Add to history
    const newHistory = editHistory.slice(0, historyIndex + 1);
    newHistory.push(operation);
    setEditHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    // Mark as unsaved
    setHasUnsavedChanges(true);
    lastChangeRef.current = Date.now();
    
    // Broadcast to collaborators
    if (enableCollaboration) {
      broadcastOperation(operation);
    }

    return operation;
  };

  const handleTextChange = useCallback((textElements: any[]) => {
    setDocumentState(prevState => ({
      ...prevState,
      textElements,
      version: prevState.version + 1,
      lastModified: Date.now()
    }));
    
    setHasUnsavedChanges(true);
    lastChangeRef.current = Date.now();
  }, []);

  const handleElementMove = useCallback((elementId: string, oldPos: any, newPos: any) => {
    createOperation('move', elementId, oldPos, newPos);
  }, [editHistory, historyIndex]);

  const handleElementStyleChange = useCallback((elementId: string, oldStyle: any, newStyle: any) => {
    createOperation('style', elementId, oldStyle, newStyle);
  }, [editHistory, historyIndex]);

  const handleElementAdd = useCallback((element: any) => {
    createOperation('add', element.id, null, element);
  }, [editHistory, historyIndex]);

  const handleElementDelete = useCallback((elementId: string, element: any) => {
    createOperation('delete', elementId, element, null);
  }, [editHistory, historyIndex]);

  const undo = () => {
    if (historyIndex >= 0) {
      const operation = editHistory[historyIndex];
      reverseOperation(operation);
      setHistoryIndex(historyIndex - 1);
      setHasUnsavedChanges(true);
    }
  };

  const redo = () => {
    if (historyIndex < editHistory.length - 1) {
      const newIndex = historyIndex + 1;
      const operation = editHistory[newIndex];
      applyOperation(operation);
      setHistoryIndex(newIndex);
      setHasUnsavedChanges(true);
    }
  };

  const applyOperation = (operation: EditOperation) => {
    setDocumentState(prevState => {
      const newState = { ...prevState };
      
      switch (operation.type) {
        case 'text':
        case 'style':
          newState.textElements = newState.textElements.map(el => 
            el.id === operation.elementId 
              ? { ...el, ...operation.newValue }
              : el
          );
          break;
        case 'move':
          newState.textElements = newState.textElements.map(el => 
            el.id === operation.elementId 
              ? { ...el, ...operation.newValue }
              : el
          );
          break;
        case 'add':
          newState.textElements.push(operation.newValue);
          break;
        case 'delete':
          newState.textElements = newState.textElements.filter(el => el.id !== operation.elementId);
          break;
      }
      
      return newState;
    });
  };

  const reverseOperation = (operation: EditOperation) => {
    setDocumentState(prevState => {
      const newState = { ...prevState };
      
      switch (operation.type) {
        case 'text':
        case 'style':
          newState.textElements = newState.textElements.map(el => 
            el.id === operation.elementId 
              ? { ...el, ...operation.oldValue }
              : el
          );
          break;
        case 'move':
          newState.textElements = newState.textElements.map(el => 
            el.id === operation.elementId 
              ? { ...el, ...operation.oldValue }
              : el
          );
          break;
        case 'add':
          newState.textElements = newState.textElements.filter(el => el.id !== operation.elementId);
          break;
        case 'delete':
          newState.textElements.push(operation.oldValue);
          break;
      }
      
      return newState;
    });
  };

  const performAutoSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;

    try {
      setIsProcessing(true);
      
      // Simulate saving to backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setHasUnsavedChanges(false);
      setLastSaveTime(Date.now());
      
      console.log('Auto-saved at', new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [hasUnsavedChanges]);

  const handleManualSave = async () => {
    try {
      setIsProcessing(true);
      
      // Generate modified PDF with current state
      if (onSave) {
        onSave(file); // In real implementation, would generate new PDF
      }
      
      setHasUnsavedChanges(false);
      setLastSaveTime(Date.now());
      
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateUserCursor = (userId: string, position: { x: number; y: number }) => {
    setCollaborativeUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, cursor: position } : user
    ));
  };

  const timeSinceLastSave = useMemo(() => {
    const diff = Date.now() - lastSaveTime;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s ago`;
    }
    return `${seconds}s ago`;
  }, [lastSaveTime]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-4">
          {/* Left Section - Tools */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              <Button
                size="sm"
                variant={currentTool === 'select' ? 'default' : 'ghost'}
                onClick={() => setCurrentTool('select')}
              >
                <MousePointer size={16} />
              </Button>
              <Button
                size="sm"
                variant={currentTool === 'text' ? 'default' : 'ghost'}
                onClick={() => setCurrentTool('text')}
              >
                <Type size={16} />
              </Button>
              <Button
                size="sm"
                variant={currentTool === 'annotate' ? 'default' : 'ghost'}
                onClick={() => setCurrentTool('annotate')}
              >
                <Edit3 size={16} />
              </Button>
            </div>
            
            <div className="w-px h-8 bg-gray-300" />
            
            <div className="flex items-center space-x-1">
              <Button size="sm" variant="ghost" onClick={undo} disabled={historyIndex < 0}>
                <Undo size={16} />
              </Button>
              <Button size="sm" variant="ghost" onClick={redo} disabled={historyIndex >= editHistory.length - 1}>
                <Redo size={16} />
              </Button>
            </div>
            
            <div className="flex items-center space-x-1">
              <Button size="sm" variant="ghost" onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.25))}>
                <ZoomOut size={16} />
              </Button>
              <span className="text-sm font-medium w-16 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button size="sm" variant="ghost" onClick={() => setZoom(prev => Math.min(prev + 0.25, 3))}>
                <ZoomIn size={16} />
              </Button>
            </div>
          </div>

          {/* Center Section - Document Info */}
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-800 truncate max-w-xs">
              {file.name}
            </h2>
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
              <span>Version {documentState.version}</span>
              {enableCollaboration && (
                <div className="flex items-center space-x-1">
                  <div className={clsx(
                    'w-2 h-2 rounded-full',
                    isConnected ? 'bg-green-400' : 'bg-red-400'
                  )} />
                  <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
              )}
              {collaborativeUsers.length > 0 && (
                <span>{collaborativeUsers.length} collaborator{collaborativeUsers.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowGrid(!showGrid)}
                className={showGrid ? 'bg-blue-100' : ''}
              >
                <Grid size={16} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowRulers(!showRulers)}
                className={showRulers ? 'bg-blue-100' : ''}
              >
                <Ruler size={16} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className={isPreviewMode ? 'bg-blue-100' : ''}
              >
                {isPreviewMode ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </div>
            
            <div className="w-px h-8 bg-gray-300" />
            
            {enableCollaboration && (
              <Button size="sm" variant="outline">
                <Share2 size={16} />
                Share
              </Button>
            )}
            
            <Button
              onClick={handleManualSave}
              disabled={!hasUnsavedChanges || isProcessing}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isProcessing ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save
            </Button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>{documentState.textElements.length} text elements</span>
              {selectedElements.size > 0 && (
                <span>{selectedElements.size} selected</span>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {hasUnsavedChanges && (
                <div className="flex items-center space-x-1 text-orange-600">
                  <AlertCircle size={14} />
                  <span>Unsaved changes</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Clock size={14} />
                <span>Last saved {timeSinceLastSave}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 overflow-hidden">
        <AdvancedPDFCanvas
          file={file}
          onSave={handleManualSave}
          onTextChange={handleTextChange}
        />
      </div>

      {/* Collaborative Cursors */}
      {enableCollaboration && collaborativeUsers.map(user => (
        user.cursor && (
          <div
            key={user.id}
            className="absolute pointer-events-none z-50"
            style={{
              left: user.cursor.x,
              top: user.cursor.y,
              transform: 'translate(-2px, -2px)'
            }}
          >
            <div
              className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
              style={{ backgroundColor: user.color }}
            />
            <div
              className="mt-1 px-2 py-1 text-xs text-white rounded shadow-lg whitespace-nowrap"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </div>
          </div>
        )
      ))}
    </div>
  );
}