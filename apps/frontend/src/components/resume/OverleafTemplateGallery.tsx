import React, { useState, useEffect } from 'react';
import { 
  SparklesIcon, 
  DocumentTextIcon, 
  CheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { api } from '../../services/api';
import { toast } from 'sonner';

interface OverleafTemplate {
  id: string;
  name: string;
  description: string;
  category: 'modern' | 'professional' | 'creative' | 'academic' | 'minimalist';
  screenshotUrl?: string;
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

const categoryConfig = {
  modern: {
    name: 'Modern',
    icon: SparklesIcon,
    gradient: 'from-blue-500 to-purple-600',
    description: 'Contemporary designs with clean typography'
  },
  professional: {
    name: 'Professional',
    icon: DocumentTextIcon,
    gradient: 'from-emerald-500 to-teal-600',
    description: 'Corporate-friendly layouts for business environments'
  },
  creative: {
    name: 'Creative',
    icon: SparklesIcon,
    gradient: 'from-pink-500 to-rose-600',
    description: 'Bold designs for creative professionals'
  },
  academic: {
    name: 'Academic',
    icon: DocumentTextIcon,
    gradient: 'from-indigo-500 to-blue-600',
    description: 'Research-focused layouts for academic positions'
  },
  minimalist: {
    name: 'Minimalist',
    icon: DocumentTextIcon,
    gradient: 'from-gray-500 to-slate-600',
    description: 'Clean, simple designs with maximum readability'
  },
  technology: {
    name: 'Technology',
    icon: DocumentTextIcon,
    gradient: 'from-blue-500 to-cyan-600',
    description: 'Tech-focused layouts with project emphasis'
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
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template => 
    selectedCategory === 'all' || template.category === selectedCategory
  );

  const handleTemplateSelect = (templateId: string) => {
    onTemplateSelect(templateId);
    if (onClose) {
      onClose();
    }
  };

  const categories = Object.entries(categoryConfig);
  const uniqueCategories = [...new Set(templates.map(t => t.category))];

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-accent-primary mx-auto mb-4" />
          <p className="text-dark-text-secondary">Loading Overleaf templates...</p>
        </div>
      </div>
    );
  }

  const getImageUrl = (url: string | undefined) => {
    if (!url) return '';
    // Use the same base URL as other API calls
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    // Combine the base URL with the relative path from the backend.
    // Ensures no double slashes.
    return `${apiUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-accent-primary to-accent-secondary rounded-lg flex items-center justify-center">
            <SparklesIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold gradient-text-dark">Overleaf Templates</h2>
            <p className="text-dark-text-secondary">Professional LaTeX templates with pixel-perfect rendering</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-dark-text-tertiary">
          <CheckIconSolid className="h-4 w-4 text-accent-success" />
          <span>Pixel-perfect LaTeX compilation</span>
          <CheckIconSolid className="h-4 w-4 text-accent-success ml-4" />
          <span>Professional typography</span>
          <CheckIconSolid className="h-4 w-4 text-accent-success ml-4" />
          <span>ATS-optimized</span>
        </div>
      </div>

      {/* Category Filters */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              selectedCategory === 'all'
                ? 'bg-accent-primary text-white shadow-glow-sm'
                : 'bg-dark-tertiary text-dark-text-secondary hover:bg-dark-quaternary'
            }`}
          >
            All Templates ({templates.length})
          </button>
          
          {uniqueCategories.map(category => {
            const config = categoryConfig[category as keyof typeof categoryConfig] || {
              name: category.charAt(0).toUpperCase() + category.slice(1),
              icon: DocumentTextIcon,
              gradient: 'from-gray-500 to-slate-600',
              description: `${category.charAt(0).toUpperCase() + category.slice(1)} templates`
            };
            const count = templates.filter(t => t.category === category).length;
            
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                  selectedCategory === category
                    ? 'bg-accent-primary text-white shadow-glow-sm'
                    : 'bg-dark-tertiary text-dark-text-secondary hover:bg-dark-quaternary'
                }`}
              >
                <config.icon className="h-4 w-4" />
                <span>{config.name} ({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => {
          const isSelected = selectedTemplateId === template.id;
          const config = categoryConfig[template.category];
          const imageUrl = getImageUrl(template.preview?.thumbnailUrl || template.screenshotUrl);
          
          return (
            <Card
              key={template.id}
              className={`card-glass-dark p-0 cursor-pointer transition-all duration-300 hover:shadow-glow-md group ${
                isSelected 
                  ? 'border-accent-primary shadow-glow-sm' 
                  : 'border-dark-border hover:border-accent-primary/50'
              }`}
            >
              {/* Template Preview */}
              <div className="relative mb-0 rounded-t-lg overflow-hidden bg-white/5 backdrop-blur-sm">
                <div className="aspect-[3/4] flex items-center justify-center">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={template.name}
                      className="w-full h-full object-cover"
                      style={{ 
                        display: 'block',
                        maxWidth: '100%',
                        height: 'auto'
                      }}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-dark-text-muted">
                      <DocumentTextIcon className="h-16 w-16" />
                    </div>
                  )}
                </div>
                
                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTemplateSelect(template.id);
                    }}
                    className="bg-accent-primary text-white hover:bg-accent-primary/80 shadow-lg"
                  >
                    <CheckIcon className="h-4 w-4 mr-2" />
                    Use This Template
                  </Button>
                </div>

                {/* Selected Indicator */}
                {isSelected && (
                  <div className="absolute top-3 right-3 w-6 h-6 bg-accent-primary rounded-full flex items-center justify-center">
                    <CheckIconSolid className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>

              {/* Template Info */}
              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-dark-text-primary group-hover:text-accent-primary transition-colors">
                    {template.name}
                  </h3>
                  <Badge
                    className={`bg-gradient-to-r ${config.gradient} text-white text-xs px-2 py-1`}
                  >
                    {config.name}
                  </Badge>
                </div>
                
                <p className="text-sm text-dark-text-secondary line-clamp-2">
                  {template.description}
                </p>
              </div>

              {/* Click to Select */}
              <div 
                className="absolute inset-0 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleTemplateSelect(template.id);
                }}
              />
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <DocumentTextIcon className="h-16 w-16 text-dark-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-dark-text-primary mb-2">
            No templates found
          </h3>
          <p className="text-dark-text-secondary">
            {selectedCategory === 'all' 
              ? 'No Overleaf templates are available yet.'
              : `No templates found in the ${categoryConfig[selectedCategory as keyof typeof categoryConfig]?.name} category.`
            }
          </p>
        </div>
      )}

    </div>
  );
}