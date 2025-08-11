import React, { useRef, useState, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Trash2, Save, PenTool } from 'lucide-react';
import { clsx } from 'clsx';

interface SignaturePadProps {
  onSave: (signatureData: string) => void;
  onCancel: () => void;
}

export default function SignaturePad({ onSave, onCancel }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  }, []);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  }, [isDrawing]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearSignature = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }, []);

  const saveSignature = useCallback(() => {
    if (!canvasRef.current || !hasSignature) return;

    const canvas = canvasRef.current;
    const signatureData = canvas.toDataURL('image/png');
    onSave(signatureData);
  }, [hasSignature, onSave]);

  // Touch events for mobile
  const startTouchDrawing = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    const touch = e.touches[0];

    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    setIsDrawing(true);
  }, []);

  const touchDraw = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    const touch = e.touches[0];

    if (!ctx) return;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  }, [isDrawing]);

  const stopTouchDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <PenTool size={20} className="text-accent-primary" />
            Draw Your Signature
          </h3>
          <Button
            onClick={clearSignature}
            variant="ghost"
            size="sm"
            disabled={!hasSignature}
          >
            <Trash2 size={16} />
            Clear
          </Button>
        </div>

        {/* Signature Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={400}
            height={200}
            className={clsx(
              'border-2 border-dashed border-dark-border rounded-lg bg-white cursor-crosshair',
              'hover:border-accent-primary/50 transition-colors duration-300',
              'touch-none' // Prevent default touch behaviors
            )}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startTouchDrawing}
            onTouchMove={touchDraw}
            onTouchEnd={stopTouchDrawing}
          />
          {!hasSignature && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-gray-400 text-sm">Sign here</p>
            </div>
          )}
        </div>

        <p className="text-sm text-dark-text-secondary">
          Use your mouse or finger to draw your signature above
        </p>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <Button
            onClick={onCancel}
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            onClick={saveSignature}
            variant="primary"
            disabled={!hasSignature}
          >
            <Save size={16} />
            Save Signature
          </Button>
        </div>
      </div>
    </Card>
  );
}