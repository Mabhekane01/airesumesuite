import React, { useState, useEffect, useMemo } from 'react';
import { 
  SparklesIcon, 
  DocumentTextIcon, 
  CheckIcon,
  ArrowPathIcon,
  LockClosedIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  ArrowsUpDownIcon,
  AdjustmentsHorizontalIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import { toast } from 'sonner';

interface OverleafTemplate {
  id: string;
  name: string;
  description: string;
  category: 'modern' | 'professional' | 'creative' | 'academic' | 'minimalist' | 'technology';
  screenshotUrl?: string;
  enabled?: boolean;
  preview?: {
    screenshotUrl: string;
    thumbnailUrl: string;
  };
}

interface OverleafTemplateGalleryProps {
  selectedTemplateId?: string;
  onTemplateSelect: (templateId: string) => void;
  onClose?: () => void;
}

const categoryConfig: Record<string, any> = {
  modern: {
    name: 'Modern',
    icon: SparklesIcon,
    color: 'text-brand-blue',
    bg: 'bg-brand-blue/10',
    border: 'border-brand-blue/20',
    tagline: 'Clean & Contemporary'
  },
  professional: {
    name: 'Corporate',
    icon: DocumentTextIcon,
    color: 'text-brand-dark',
    bg: 'bg-brand-dark/5',
    border: 'border-brand-dark/10',
    tagline: 'Executive Standard'
  },
  creative: {
    name: 'Creative',
    icon: SparklesIcon,
    color: 'text-brand-orange',
    bg: 'bg-brand-orange/10',
    border: 'border-brand-orange/20',
    tagline: 'Bold & Distinctive'
  },
  academic: {
    name: 'Academic',
    icon: DocumentTextIcon,
    color: 'text-brand-blue',
    bg: 'bg-brand-blue/5',
    border: 'border-brand-blue/10',
    tagline: 'Research Focused'
  },
  minimalist: {
    name: 'Minimal',
    icon: DocumentTextIcon,
    color: 'text-text-tertiary',
    bg: 'bg-surface-100',
    border: 'border-surface-200',
    tagline: 'Essential Clarity'
  },
  technology: {
    name: 'Technical',
    icon: DocumentTextIcon,
    color: 'text-brand-success',
    bg: 'bg-brand-success/10',
    border: 'border-brand-success/20',
    tagline: 'Developer Specialized'
  }
};

export default function OverleafTemplateGallery({ 
  selectedTemplateId, 
  onTemplateSelect, 
  onClose 
}: OverleafTemplateGalleryProps) {
  const [templates, setTemplates] = useState<OverleafTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'newest'>('name');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/resumes/latex-templates');
      const templatesData = response.data.data || [];
      setTemplates(templatesData);
    } catch (error) {
      console.error('Failed to load LaTeX templates:', error);
      toast.error('System Error: Assets inaccessible');
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = useMemo(() => {
    return templates
      .filter(template => {
        const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
        const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            template.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0; // Newest logic could be added here
      });
  }, [templates, selectedCategory, searchQuery, sortBy]);

  const isTemplateAvailable = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    return template?.enabled === true;
  };

  const handleTemplateSelect = (templateId: string) => {
    if (!isTemplateAvailable(templateId)) {
      toast.info('Deployment Logic: Template optimization in progress.', {
        icon: <LockClosedIcon className="w-4 h-4" />
      });
      return;
    }
    onTemplateSelect(templateId);
    if (onClose) onClose();
  };

  const uniqueCategories = useMemo(() => [...new Set(templates.map(t => t.category))], [templates]);

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <div className="absolute inset-0 bg-brand-blue/20 rounded-full blur-2xl animate-pulse" />
          <div className="w-20 h-20 rounded-[2rem] bg-white border border-surface-200 flex items-center justify-center relative z-10 shadow-xl">
            <ArrowPathIcon className="h-10 w-10 animate-spin text-brand-blue" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-sm font-black text-brand-dark uppercase tracking-[0.3em]">Compiling Assets</p>
          <p className="text-xs text-text-tertiary font-bold animate-pulse">Initializing Vector Engines...</p>
        </div>
      </div>
    );
  }

  const getImageUrl = (url: string | undefined) => {
    if (!url) return '';
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    return `${apiUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
  };

  return (
    <div className="w-full space-y-16">
      {/* --- ADVANCED FILTER CONSOLE --- */}
      <div className="bg-white border border-surface-200 rounded-[2.5rem] p-4 shadow-sm relative overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.15]" />
        
        <div className="relative z-10 flex flex-col lg:flex-row gap-6 items-stretch lg:items-center">
          {/* Search Input */}
          <div className="flex-[1.5] relative group">
            <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary group-focus-within:text-brand-blue transition-colors" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search architecture by name or keyword..."
              className="w-full bg-surface-50 border border-surface-200 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-brand-dark focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue outline-none transition-all placeholder:text-text-tertiary placeholder:font-bold"
            />
          </div>

          {/* Sort/Filter Dropdowns */}
          <div className="flex-1 flex gap-4">
            <div className="flex-1 relative">
              <AdjustmentsHorizontalIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-white border border-surface-200 rounded-2xl py-4 pl-11 pr-10 text-xs font-black uppercase tracking-widest text-brand-dark appearance-none cursor-pointer focus:ring-4 focus:ring-brand-blue/5 transition-all shadow-sm"
              >
                <option value="all">Universal Cluster</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat.toUpperCase()} Core</option>
                ))}
              </select>
              <ChevronRightIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary rotate-90 pointer-events-none" />
            </div>
            <div className="flex-1 relative">
              <ArrowsUpDownIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
              <select 
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="w-full bg-white border border-surface-200 rounded-2xl py-4 pl-11 pr-10 text-xs font-black uppercase tracking-widest text-brand-dark appearance-none cursor-pointer focus:ring-4 focus:ring-brand-blue/5 transition-all shadow-sm"
              >
                <option value="name">Sort by Name</option>
                <option value="newest">Sort by Release</option>
              </select>
              <ChevronRightIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary rotate-90 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* --- QUICK CATEGORY CHIPS --- */}
      <div className="flex flex-wrap gap-3 items-center justify-center">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
            selectedCategory === 'all'
              ? 'bg-brand-blue text-white shadow-xl shadow-brand-blue/20'
              : 'bg-white text-text-tertiary border border-surface-200 hover:border-brand-blue/30'
          }`}
        >
          All Assets
        </button>
        {uniqueCategories.map(category => {
          const config = categoryConfig[category];
          if (!config) return null;
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center gap-2 ${
                selectedCategory === category
                  ? 'bg-brand-dark text-white shadow-xl'
                  : 'bg-white text-text-tertiary border border-surface-200 hover:border-brand-dark/30'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${selectedCategory === category ? 'bg-brand-blue' : 'bg-surface-300'}`} />
              {config.name}
            </button>
          );
        })}
      </div>

      {/* --- TEMPLATES GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        <AnimatePresence mode='popLayout'>
          {filteredTemplates.map((template) => {
            const isSelected = selectedTemplateId === template.id;
            const isAvailable = isTemplateAvailable(template.id);
            const config = categoryConfig[template.category] || categoryConfig.modern;
            const imageUrl = getImageUrl(template.preview?.thumbnailUrl || template.screenshotUrl);
            
            return (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={template.id}
                onClick={() => handleTemplateSelect(template.id)}
                className={`group relative bg-white border border-surface-200 rounded-[2.5rem] p-3 transition-all duration-500 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] hover:border-brand-blue/30 ${
                  isSelected ? 'ring-4 ring-brand-blue/10 border-brand-blue shadow-2xl' : ''
                }`}
              >
                {/* Visual Area */}
                <div className="aspect-[3/4] relative rounded-[2rem] overflow-hidden bg-surface-50 border border-surface-100 shadow-inner">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={template.name}
                      className={`w-full h-full object-cover transition-transform duration-1000 ease-out ${
                        isAvailable ? 'group-hover:scale-110' : 'grayscale'
                      }`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                      <DocumentTextIcon className="h-24 w-24" />
                    </div>
                  )}

                  {/* Smart Overlay */}
                  <div className={`absolute inset-0 bg-brand-dark/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-8 transition-all duration-500 opacity-0 ${
                    isAvailable ? 'group-hover:opacity-100 translate-y-4 group-hover:translate-y-0' : ''
                  }`}>
                    <div className="w-20 h-20 rounded-[1.5rem] bg-white border border-white/20 flex items-center justify-center mb-8 shadow-2xl group-hover:rotate-6 transition-all duration-500">
                      <EyeIcon className="w-10 h-10 text-brand-blue" />
                    </div>
                    <div className="text-center space-y-4">
                      <p className="text-white text-xl font-black tracking-tight tracking-tight">Deploy Architecture</p>
                      <div className="flex gap-2 justify-center">
                        <span className="px-3 py-1 rounded-lg bg-white/10 text-[9px] font-black text-white uppercase tracking-widest border border-white/10">Vector Source</span>
                        <span className="px-3 py-1 rounded-lg bg-white/10 text-[9px] font-black text-white uppercase tracking-widest border border-white/10">ATS-Core</span>
                      </div>
                    </div>
                  </div>

                  {/* Availability Logic */}
                  {!isAvailable && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center p-8">
                      <div className="space-y-4 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mx-auto shadow-sm">
                          <LockClosedIcon className="w-6 h-6 text-brand-orange" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-black text-brand-dark uppercase tracking-widest">Logic Locked</p>
                          <p className="text-[10px] font-bold text-text-tertiary leading-tight">Optimization suite pending final validation.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Selection Badge */}
                  {isSelected && (
                    <div className="absolute top-6 right-6 w-12 h-12 bg-brand-blue text-white rounded-2xl flex items-center justify-center shadow-2xl z-20 animate-scale-in">
                      <CheckIconSolid className="h-7 w-7" />
                    </div>
                  )}
                </div>

                {/* Metadata Area */}
                <div className="p-8 pt-10 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm ${config.border} ${config.bg} ${config.color}`}>
                      {config.tagline}
                    </div>
                    {isAvailable && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-brand-success animate-pulse" />
                        <span className="text-[10px] font-black text-brand-success uppercase tracking-widest">Operational</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-2xl font-black text-brand-dark tracking-tight leading-none group-hover:text-brand-blue transition-colors">
                      {template.name}
                    </h3>
                    <p className="text-sm font-bold text-text-secondary line-clamp-2 opacity-70 leading-relaxed">
                      {template.description}
                    </p>
                  </div>

                  {/* Technical Meta (Decorative) */}
                  <div className="pt-6 border-t border-surface-100 flex items-center justify-between text-[10px] font-black text-text-tertiary uppercase tracking-widest">
                    <span>Typeset: LaTeX</span>
                    <span className="text-brand-blue opacity-40 group-hover:opacity-100 transition-opacity">Module v4.2</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* --- EMPTY STATE --- */}
      {filteredTemplates.length === 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-40 bg-white border border-surface-200 rounded-[3rem] shadow-sm relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px_32px] opacity-20" />
          <div className="relative z-10 space-y-8">
            <div className="w-24 h-24 rounded-[2.5rem] bg-surface-50 border border-surface-200 flex items-center justify-center mx-auto shadow-sm group hover:scale-110 transition-transform">
              <MagnifyingGlassIcon className="h-10 w-10 text-text-tertiary group-hover:text-brand-blue transition-colors" />
            </div>
            <div className="space-y-3">
              <h3 className="text-3xl font-black text-brand-dark tracking-tighter">Architecture Not Found.</h3>
              <p className="text-lg text-text-secondary font-bold max-w-sm mx-auto opacity-80 leading-relaxed">
                The global template cluster yielded zero results for this specific query configuration.
              </p>
            </div>
            <button 
              onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
              className="px-10 py-4 bg-brand-dark text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-slate-800 transition-all active:scale-95"
            >
              Reset Terminal Grid
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
