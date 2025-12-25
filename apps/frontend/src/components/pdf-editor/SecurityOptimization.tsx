import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { 
  Shield, Lock, Unlock, Eye, EyeOff, Key, Download, Upload,
  Zap, Minimize, FileText, Image, Settings, AlertTriangle,
  CheckCircle, Clock, Percent, HardDrive, Cpu, Type
} from 'lucide-react';
import { clsx } from 'clsx';

interface SecuritySettings {
  password: string;
  confirmPassword: string;
  permissions: {
    print: boolean;
    copy: boolean;
    edit: boolean;
    annotate: boolean;
    fillForms: boolean;
    extract: boolean;
    assemble: boolean;
    quality: boolean;
  };
  encryption: '40bit' | '128bit' | '256bit';
}

interface OptimizationSettings {
  quality: 'low' | 'medium' | 'high' | 'maximum';
  colorSpace: 'rgb' | 'grayscale' | 'monochrome';
  dpi: number;
  compressImages: boolean;
  compressText: boolean;
  removeMetadata: boolean;
  removeBookmarks: boolean;
  removeComments: boolean;
  linearize: boolean;
}

interface SecurityOptimizationProps {
  onSecureDocument: (settings: SecuritySettings) => void;
  onOptimizeDocument: (settings: OptimizationSettings) => void;
  onAnalyzeDocument: () => void;
  documentInfo?: {
    size: number;
    pages: number;
    images: number;
    fonts: number;
    metadata: Record<string, any>;
  };
  isProcessing: boolean;
}

export default function SecurityOptimization({
  onSecureDocument,
  onOptimizeDocument,
  onAnalyzeDocument,
  documentInfo,
  isProcessing
}: SecurityOptimizationProps) {
  const [activeTab, setActiveTab] = useState<'security' | 'optimize' | 'analyze'>('security');
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    password: '',
    confirmPassword: '',
    permissions: {
      print: true,
      copy: true,
      edit: false,
      annotate: true,
      fillForms: true,
      extract: false,
      assemble: false,
      quality: true
    },
    encryption: '256bit'
  });
  
  const [optimizationSettings, setOptimizationSettings] = useState<OptimizationSettings>({
    quality: 'high',
    colorSpace: 'rgb',
    dpi: 150,
    compressImages: true,
    compressText: true,
    removeMetadata: false,
    removeBookmarks: false,
    removeComments: false,
    linearize: true
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const tabs = [
    { id: 'security', label: 'Security', icon: Shield, color: 'from-red-500 to-orange-600' },
    { id: 'optimize', label: 'Optimize', icon: Zap, color: 'from-green-500 to-emerald-600' },
    { id: 'analyze', label: 'Analyze', icon: FileText, color: 'from-blue-500 to-cyan-600' }
  ] as const;

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getQualityDescription = (quality: string) => {
    const descriptions = {
      low: 'Smallest file size, lowest quality',
      medium: 'Balanced size and quality',
      high: 'Good quality, moderate compression',
      maximum: 'Best quality, minimal compression'
    };
    return descriptions[quality as keyof typeof descriptions];
  };

  const getEstimatedSavings = () => {
    if (!documentInfo) return 0;
    let savings = 0;
    if (optimizationSettings.compressImages) savings += 30;
    if (optimizationSettings.compressText) savings += 10;
    if (optimizationSettings.removeMetadata) savings += 5;
    if (optimizationSettings.colorSpace === 'grayscale') savings += 15;
    if (optimizationSettings.colorSpace === 'monochrome') savings += 40;
    return Math.min(savings, 80);
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-2">
        <div className="flex gap-2">
          {tabs.map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-300',
                activeTab === id
                  ? `bg-gradient-to-r ${color} text-white shadow-lg`
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              )}
            >
              <Icon size={18} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Password Protection */}
          <div className="bg-white/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Lock size={20} className="text-red-400" />
              Password Protection
            </h3>
            
            <div className="space-y-4">
              <div className="relative">
                <label className="text-sm text-gray-300 mb-2 block">Document Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={securitySettings.password}
                    onChange={(e) => setSecuritySettings({
                      ...securitySettings,
                      password: e.target.value
                    })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white pr-12 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Enter password to protect document"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={securitySettings.confirmPassword}
                  onChange={(e) => setSecuritySettings({
                    ...securitySettings,
                    confirmPassword: e.target.value
                  })}
                  className={clsx(
                    'w-full bg-white/10 border rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2',
                    securitySettings.password && securitySettings.confirmPassword &&
                    securitySettings.password !== securitySettings.confirmPassword
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-white/20 focus:ring-red-500'
                  )}
                  placeholder="Confirm password"
                />
                {securitySettings.password && securitySettings.confirmPassword &&
                 securitySettings.password !== securitySettings.confirmPassword && (
                  <p className="text-red-400 text-sm mt-1">Passwords do not match</p>
                )}
              </div>
              
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Encryption Level</label>
                <select
                  value={securitySettings.encryption}
                  onChange={(e) => setSecuritySettings({
                    ...securitySettings,
                    encryption: e.target.value as SecuritySettings['encryption']
                  })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="40bit" className="bg-surface-50">40-bit (Basic)</option>
                  <option value="128bit" className="bg-surface-50">128-bit (Standard)</option>
                  <option value="256bit" className="bg-surface-50">256-bit (Military Grade)</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Permissions */}
          <div className="bg-white/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Key size={20} className="text-yellow-400" />
              Document Permissions
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(securitySettings.permissions).map(([key, value]) => {
                const labels = {
                  print: 'Allow Printing',
                  copy: 'Allow Copy Text',
                  edit: 'Allow Editing',
                  annotate: 'Allow Annotations',
                  fillForms: 'Allow Form Filling',
                  extract: 'Allow Content Extraction',
                  assemble: 'Allow Document Assembly',
                  quality: 'Allow High Quality Printing'
                };
                
                return (
                  <label key={key} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => setSecuritySettings({
                        ...securitySettings,
                        permissions: {
                          ...securitySettings.permissions,
                          [key]: e.target.checked
                        }
                      })}
                      className="w-4 h-4 text-red-500 bg-white/10 border-white/20 rounded focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-300">
                      {labels[key as keyof typeof labels]}
                    </span>
                  </label>
                );
              })}
            </div>
            
            <div className="mt-6 pt-4 border-t border-white/10">
              <Button
                onClick={() => onSecureDocument(securitySettings)}
                disabled={!securitySettings.password || securitySettings.password !== securitySettings.confirmPassword || isProcessing}
                isLoading={isProcessing}
                className="w-full bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700"
              >
                <Shield size={18} />
                Apply Security Settings
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Optimization Tab */}
      {activeTab === 'optimize' && (
        <div className="space-y-6">
          {/* Quality Settings */}
          <div className="bg-white/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Settings size={20} className="text-green-400" />
              Optimization Settings
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="text-sm text-gray-300 mb-3 block">Quality Level</label>
                <div className="space-y-3">
                  {(['low', 'medium', 'high', 'maximum'] as const).map((quality) => (
                    <label key={quality} className="flex items-center gap-3 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                      <input
                        type="radio"
                        name="quality"
                        checked={optimizationSettings.quality === quality}
                        onChange={() => setOptimizationSettings({
                          ...optimizationSettings,
                          quality
                        })}
                        className="w-4 h-4 text-green-500 bg-white/10 border-white/20 focus:ring-green-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium capitalize">{quality} Quality</span>
                          <span className="text-xs text-gray-400">
                            {quality === 'low' && '~80% reduction'}
                            {quality === 'medium' && '~50% reduction'}
                            {quality === 'high' && '~30% reduction'}
                            {quality === 'maximum' && '~10% reduction'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                          {getQualityDescription(quality)}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-300 mb-3 block">Color Space</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['rgb', 'grayscale', 'monochrome'] as const).map((colorSpace) => (
                    <button
                      key={colorSpace}
                      onClick={() => setOptimizationSettings({
                        ...optimizationSettings,
                        colorSpace
                      })}
                      className={clsx(
                        'p-3 rounded-lg transition-all duration-300 text-center',
                        optimizationSettings.colorSpace === colorSpace
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                          : 'bg-white/5 hover:bg-white/10 text-gray-300'
                      )}
                    >
                      <span className="text-sm font-medium capitalize">{colorSpace}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-300 mb-3 block">
                  Image DPI: {optimizationSettings.dpi}
                </label>
                <input
                  type="range"
                  min="72"
                  max="300"
                  step="1"
                  value={optimizationSettings.dpi}
                  onChange={(e) => setOptimizationSettings({
                    ...optimizationSettings,
                    dpi: parseInt(e.target.value)
                  })}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>72 DPI (Web)</span>
                  <span>150 DPI (Standard)</span>
                  <span>300 DPI (Print)</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Advanced Options */}
          <div className="bg-white/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Cpu size={20} className="text-teal-400" />
              Advanced Options
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'compressImages', label: 'Compress Images', icon: Image },
                { key: 'compressText', label: 'Compress Text', icon: FileText },
                { key: 'removeMetadata', label: 'Remove Metadata', icon: HardDrive },
                { key: 'removeBookmarks', label: 'Remove Bookmarks', icon: FileText },
                { key: 'removeComments', label: 'Remove Comments', icon: FileText },
                { key: 'linearize', label: 'Optimize for Web', icon: Zap }
              ].map(({ key, label, icon: Icon }) => (
                <label key={key} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optimizationSettings[key as keyof OptimizationSettings] as boolean}
                    onChange={(e) => setOptimizationSettings({
                      ...optimizationSettings,
                      [key]: e.target.checked
                    })}
                    className="w-4 h-4 text-green-500 bg-white/10 border-white/20 rounded focus:ring-green-500"
                  />
                  <Icon size={16} className="text-teal-400" />
                  <span className="text-sm text-gray-300">{label}</span>
                </label>
              ))}
            </div>
            
            {/* Estimated Savings */}
            <div className="mt-6 p-4 bg-gradient-to-r from-green-500/20 to-emerald-600/20 rounded-lg border border-green-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent size={18} className="text-green-400" />
                  <span className="text-white font-medium">Estimated File Size Reduction</span>
                </div>
                <span className="text-2xl font-bold text-green-400">{getEstimatedSavings()}%</span>
              </div>
              {documentInfo && (
                <p className="text-sm text-gray-300 mt-2">
                  Current: {formatFileSize(documentInfo.size)} → 
                  Estimated: {formatFileSize(documentInfo.size * (1 - getEstimatedSavings() / 100))}
                </p>
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t border-white/10">
              <Button
                onClick={() => onOptimizeDocument(optimizationSettings)}
                isLoading={isProcessing}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                <Zap size={18} />
                Optimize Document
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Tab */}
      {activeTab === 'analyze' && (
        <div className="space-y-6">
          <div className="bg-white/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <FileText size={20} className="text-teal-400" />
              Document Analysis
            </h3>
            
            <Button
              onClick={onAnalyzeDocument}
              isLoading={isProcessing}
              className="w-full mb-6 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
            >
              <FileText size={18} />
              Analyze Document
            </Button>
            
            {documentInfo && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileSize size={16} className="text-teal-400" />
                    <span className="text-sm text-gray-300">File Size</span>
                  </div>
                  <span className="text-xl font-bold text-white">{formatFileSize(documentInfo.size)}</span>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={16} className="text-green-400" />
                    <span className="text-sm text-gray-300">Pages</span>
                  </div>
                  <span className="text-xl font-bold text-white">{documentInfo.pages}</span>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Image size={16} className="text-emerald-400" />
                    <span className="text-sm text-gray-300">Images</span>
                  </div>
                  <span className="text-xl font-bold text-white">{documentInfo.images}</span>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Type size={16} className="text-yellow-400" />
                    <span className="text-sm text-gray-300">Fonts</span>
                  </div>
                  <span className="text-xl font-bold text-white">{documentInfo.fonts}</span>
                </div>
              </div>
            )}
            
            {analysisResult && (
              <div className="mt-6 space-y-4">
                <h4 className="text-white font-medium">Optimization Recommendations</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                    <AlertTriangle size={16} className="text-yellow-400" />
                    <span className="text-sm text-gray-300">Large images detected - consider compression</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-green-500/20 rounded-lg border border-green-500/30">
                    <CheckCircle size={16} className="text-green-400" />
                    <span className="text-sm text-gray-300">Document structure is optimized</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}