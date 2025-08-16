import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { 
  Type, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Palette, Plus, Minus, RotateCw, Move, Copy, Trash2, Edit3
} from 'lucide-react';
import { clsx } from 'clsx';

interface WordElement {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  rotation: number;
  isSelected: boolean;
  isEditing: boolean;
  originalIndex: number;
}

interface TextLine {
  id: string;
  words: WordElement[];
  x: number;
  y: number;
  width: number;
  height: number;
  alignment: 'left' | 'center' | 'right' | 'justify';
}

interface InteractiveTextEditorProps {
  extractedText: any[];
  pageWidth: number;
  pageHeight: number;
  scale: number;
  onTextChange?: (words: WordElement[]) => void;
  onSelectionChange?: (selectedWords: WordElement[]) => void;
}

export default function InteractiveTextEditor({
  extractedText,
  pageWidth,
  pageHeight,
  scale,
  onTextChange,
  onSelectionChange
}: InteractiveTextEditorProps) {
  const [words, setWords] = useState<WordElement[]>([]);
  const [textLines, setTextLines] = useState<TextLine[]>([]);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
  const [editingWord, setEditingWord] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const selectionBoxRef = useRef<HTMLDivElement>(null);

  // Process extracted text into word-level elements
  useEffect(() => {
    if (extractedText.length > 0) {
      processTextIntoWords();
    }
  }, [extractedText]);

  const processTextIntoWords = useCallback(() => {
    const processedWords: WordElement[] = [];
    const lines: TextLine[] = [];
    
    extractedText.forEach((textItem, itemIndex) => {
      const text = textItem.str?.trim();
      if (!text) return;

      const transform = textItem.transform;
      const x = transform[4];
      const y = pageHeight - transform[5]; // Convert PDF coordinates
      const fontSize = Math.abs(transform[0]) || 14;
      const fontFamily = textItem.fontName?.split('+').pop() || 'Arial';

      // Split text into words
      const wordsInItem = text.split(/(\s+)/);
      let currentX = x;
      const wordElements: WordElement[] = [];

      wordsInItem.forEach((wordText, wordIndex) => {
        if (wordText.trim() === '') {
          // Handle spaces
          currentX += fontSize * 0.3; // Approximate space width
          return;
        }

        const wordWidth = estimateTextWidth(wordText, fontSize, fontFamily);
        const wordElement: WordElement = {
          id: `word-${itemIndex}-${wordIndex}`,
          text: wordText,
          x: currentX,
          y: y,
          width: wordWidth,
          height: fontSize * 1.2,
          fontSize,
          fontFamily,
          color: '#000000',
          bold: false,
          italic: false,
          underline: false,
          rotation: 0,
          isSelected: false,
          isEditing: false,
          originalIndex: processedWords.length
        };

        wordElements.push(wordElement);
        processedWords.push(wordElement);
        currentX += wordWidth + (fontSize * 0.2); // Add word spacing
      });

      // Group words into lines
      if (wordElements.length > 0) {
        const lineId = `line-${lines.length}`;
        const lineX = Math.min(...wordElements.map(w => w.x));
        const lineWidth = Math.max(...wordElements.map(w => w.x + w.width)) - lineX;
        
        lines.push({
          id: lineId,
          words: wordElements,
          x: lineX,
          y: y,
          width: lineWidth,
          height: fontSize * 1.2,
          alignment: 'left'
        });
      }
    });

    setWords(processedWords);
    setTextLines(lines);
  }, [extractedText, pageHeight]);

  // Estimate text width (rough approximation)
  const estimateTextWidth = (text: string, fontSize: number, fontFamily: string): number => {
    // Create a temporary canvas to measure text
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    ctx.font = `${fontSize}px ${fontFamily}`;
    return ctx.measureText(text).width;
  };

  // Handle mouse events for selection and editing
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = editorRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    // Check if clicking on a word
    const clickedWord = words.find(word => 
      x >= word.x && x <= word.x + word.width &&
      y >= word.y && y <= word.y + word.height
    );

    if (clickedWord) {
      if (e.shiftKey) {
        // Add to selection
        const newSelection = new Set(selectedWords);
        if (newSelection.has(clickedWord.id)) {
          newSelection.delete(clickedWord.id);
        } else {
          newSelection.add(clickedWord.id);
        }
        setSelectedWords(newSelection);
        updateWordSelection(newSelection);
      } else if (e.ctrlKey || e.metaKey) {
        // Toggle selection
        const newSelection = new Set(selectedWords);
        if (newSelection.has(clickedWord.id)) {
          newSelection.delete(clickedWord.id);
        } else {
          newSelection.add(clickedWord.id);
        }
        setSelectedWords(newSelection);
        updateWordSelection(newSelection);
      } else {
        // Single selection
        const newSelection = new Set([clickedWord.id]);
        setSelectedWords(newSelection);
        updateWordSelection(newSelection);
        
        // Start drag
        setIsDragging(true);
        setDragStartPos({ x, y });
      }
    } else {
      // Start selection box
      setIsSelecting(true);
      setSelectionStart({ x, y });
      setSelectionEnd({ x, y });
      setSelectedWords(new Set());
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = editorRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    if (isSelecting) {
      setSelectionEnd({ x, y });
      
      // Update selection box
      const minX = Math.min(selectionStart.x, x);
      const minY = Math.min(selectionStart.y, y);
      const maxX = Math.max(selectionStart.x, x);
      const maxY = Math.max(selectionStart.y, y);
      
      // Find words within selection
      const wordsInSelection = words.filter(word => 
        word.x >= minX && word.x + word.width <= maxX &&
        word.y >= minY && word.y + word.height <= maxY
      );
      
      const newSelection = new Set(wordsInSelection.map(w => w.id));
      setSelectedWords(newSelection);
      updateWordSelection(newSelection);
      
    } else if (isDragging && selectedWords.size > 0) {
      // Drag selected words
      const deltaX = x - dragStartPos.x;
      const deltaY = y - dragStartPos.y;
      
      setWords(prevWords => prevWords.map(word => 
        selectedWords.has(word.id)
          ? { ...word, x: word.x + deltaX, y: word.y + deltaY }
          : word
      ));
      
      setDragStartPos({ x, y });
    }
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    setIsDragging(false);
    
    if (onTextChange) {
      onTextChange(words);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const rect = editorRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    const clickedWord = words.find(word => 
      x >= word.x && x <= word.x + word.width &&
      y >= word.y && y <= word.y + word.height
    );

    if (clickedWord) {
      startEditingWord(clickedWord.id);
    }
  };

  const updateWordSelection = (selection: Set<string>) => {
    const updatedWords = words.map(word => ({
      ...word,
      isSelected: selection.has(word.id)
    }));
    setWords(updatedWords);
    
    if (onSelectionChange) {
      const selectedWordElements = updatedWords.filter(word => word.isSelected);
      onSelectionChange(selectedWordElements);
    }
  };

  const startEditingWord = (wordId: string) => {
    setEditingWord(wordId);
    setWords(prevWords => prevWords.map(word => ({
      ...word,
      isEditing: word.id === wordId
    })));
  };

  const finishEditingWord = (wordId: string, newText: string) => {
    setWords(prevWords => prevWords.map(word => 
      word.id === wordId
        ? { 
            ...word, 
            text: newText, 
            isEditing: false,
            width: estimateTextWidth(newText, word.fontSize, word.fontFamily)
          }
        : word
    ));
    setEditingWord(null);
    
    if (onTextChange) {
      onTextChange(words);
    }
  };

  const updateSelectedWordsStyle = (updates: Partial<WordElement>) => {
    setWords(prevWords => prevWords.map(word => 
      selectedWords.has(word.id)
        ? { ...word, ...updates }
        : word
    ));
  };

  const deleteSelectedWords = () => {
    const newWords = words.filter(word => !selectedWords.has(word.id));
    setWords(newWords);
    setSelectedWords(new Set());
    
    if (onTextChange) {
      onTextChange(newWords);
    }
  };

  const duplicateSelectedWords = () => {
    const selectedWordsList = words.filter(word => selectedWords.has(word.id));
    const duplicates = selectedWordsList.map((word, index) => ({
      ...word,
      id: `duplicate-${word.id}-${Date.now()}`,
      x: word.x + 20,
      y: word.y + 20,
      isSelected: false
    }));
    
    setWords(prevWords => [...prevWords, ...duplicates]);
    
    if (onTextChange) {
      onTextChange([...words, ...duplicates]);
    }
  };

  return (
    <div 
      ref={editorRef}
      className="relative w-full h-full overflow-auto bg-white"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      style={{ 
        width: pageWidth * scale, 
        height: pageHeight * scale,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      {/* Selection Box */}
      {isSelecting && (
        <div
          className="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-30 pointer-events-none"
          style={{
            left: Math.min(selectionStart.x, selectionEnd.x) * scale,
            top: Math.min(selectionStart.y, selectionEnd.y) * scale,
            width: Math.abs(selectionEnd.x - selectionStart.x) * scale,
            height: Math.abs(selectionEnd.y - selectionStart.y) * scale
          }}
        />
      )}

      {/* Word Elements */}
      {words.map(word => (
        <div
          key={word.id}
          className={clsx(
            'absolute select-none transition-all duration-150',
            word.isSelected && 'ring-2 ring-blue-500 bg-blue-50',
            'hover:bg-gray-100 cursor-pointer'
          )}
          style={{
            left: word.x * scale,
            top: word.y * scale,
            width: word.width * scale,
            height: word.height * scale,
            fontSize: word.fontSize * scale,
            fontFamily: word.fontFamily,
            color: word.color,
            fontWeight: word.bold ? 'bold' : 'normal',
            fontStyle: word.italic ? 'italic' : 'normal',
            textDecoration: word.underline ? 'underline' : 'none',
            transform: `rotate(${word.rotation}deg)`,
            transformOrigin: 'center',
            lineHeight: 1.2,
            display: 'flex',
            alignItems: 'center',
            padding: '2px'
          }}
        >
          {word.isEditing ? (
            <input
              type="text"
              value={word.text}
              onChange={(e) => {
                setWords(prevWords => prevWords.map(w => 
                  w.id === word.id ? { ...w, text: e.target.value } : w
                ));
              }}
              onBlur={(e) => finishEditingWord(word.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  finishEditingWord(word.id, e.currentTarget.value);
                } else if (e.key === 'Escape') {
                  finishEditingWord(word.id, word.text);
                }
              }}
              autoFocus
              className="w-full h-full bg-transparent border-none outline-none"
              style={{
                fontSize: word.fontSize * scale,
                fontFamily: word.fontFamily,
                color: word.color,
                fontWeight: word.bold ? 'bold' : 'normal',
                fontStyle: word.italic ? 'italic' : 'normal'
              }}
            />
          ) : (
            <span className="truncate">{word.text}</span>
          )}
        </div>
      ))}

      {/* Floating Toolbar for Selected Words */}
      {selectedWords.size > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <Card>
            <div className="flex items-center space-x-2 p-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateSelectedWordsStyle({ bold: !words.find(w => selectedWords.has(w.id))?.bold })}
              >
                <Bold size={14} />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateSelectedWordsStyle({ italic: !words.find(w => selectedWords.has(w.id))?.italic })}
              >
                <Italic size={14} />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateSelectedWordsStyle({ underline: !words.find(w => selectedWords.has(w.id))?.underline })}
              >
                <Underline size={14} />
              </Button>
              
              <div className="w-px h-6 bg-gray-300" />
              
              <input
                type="color"
                value={words.find(w => selectedWords.has(w.id))?.color || '#000000'}
                onChange={(e) => updateSelectedWordsStyle({ color: e.target.value })}
                className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
              />
              
              <input
                type="range"
                min="8"
                max="48"
                value={words.find(w => selectedWords.has(w.id))?.fontSize || 14}
                onChange={(e) => updateSelectedWordsStyle({ fontSize: parseInt(e.target.value) })}
                className="w-20"
              />
              
              <div className="w-px h-6 bg-gray-300" />
              
              <Button size="sm" variant="outline" onClick={duplicateSelectedWords}>
                <Copy size={14} />
              </Button>
              <Button size="sm" variant="outline" onClick={deleteSelectedWords}>
                <Trash2 size={14} />
              </Button>
              
              <span className="text-sm text-gray-600 ml-2">
                {selectedWords.size} word{selectedWords.size !== 1 ? 's' : ''} selected
              </span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}