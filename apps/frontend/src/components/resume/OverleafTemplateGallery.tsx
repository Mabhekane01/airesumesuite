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
    gradient: 'from-indigo-500 to-teal-600',
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

  // Check if we're in production mode
  const isProduction = false; // Temporarily set to false for testing
  
  // Function to check if template is available
  const isTemplateAvailable = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    return template?.enabled === true;
  };

  const handleTemplateSelect = (templateId: string) => {
    // Check if template is available for selection
    if (!isTemplateAvailable(templateId)) {
      toast.info('This template is coming soon! We\'re working hard to make it available for you.', {
        duration: 4000,
        position: 'top-center'
      });
      return;
    }
    
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

        {/* Production Notice */}
        {isProduction && (
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-teal-500/20 rounded-xl">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <SparklesIcon className="h-5 w-5 text-teal-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-dark-text-primary mb-1">
                  🚀 More Templates Coming Soon!
                </h3>
                <p className="text-dark-text-secondary text-sm leading-relaxed">
                  We're currently perfecting our template collection. The <span className="text-teal-400 font-medium">ASU Sparky Sundevil template</span> is ready for use, 
                  while other templates are being fine-tuned for the best experience. Stay tuned for updates!
                </p>
                <div className="mt-2 text-xs text-dark-text-tertiary">
                  ✨ New templates will be automatically available once they're ready
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Category Filters */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              selectedCategory === 'all'
                ? 'bg-accent-primary text-white shadow-glow-sm'
                : 'bg-gray-700 text-dark-text-secondary hover:bg-dark-quaternary'
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
                    : 'bg-gray-700 text-dark-text-secondary hover:bg-dark-quaternary'
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
          const isAvailable = isTemplateAvailable(template.id);
          const config = categoryConfig[template.category];
          const imageUrl = getImageUrl(template.preview?.thumbnailUrl || template.screenshotUrl);
          
          return (
            <Card
              key={template.id}
              className={`card-glass-dark p-0 transition-all duration-300 group relative ${
                !isAvailable
                  ? 'opacity-60 cursor-not-allowed'
                  : 'cursor-pointer hover:shadow-glow-md'
              } ${
                isSelected 
                  ? 'border-accent-primary shadow-glow-sm' 
                  : isAvailable
                    ? 'border-dark-border hover:border-accent-primary/50'
                    : 'border-dark-border/50'
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
                <div className={`absolute inset-0 bg-gray-900/50 opacity-0 transition-opacity duration-200 flex items-center justify-center ${
                  isAvailable ? 'group-hover:opacity-100' : ''
                }`}>
                  {isAvailable ? (
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
                  ) : (
                    <div className="opacity-100 text-center">
                      <div className="bg-orange-500/90 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-lg">
                        🚧 Coming Soon
                      </div>
                      <div className="mt-2 text-white/80 text-xs">
                        Being perfected for you
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Disabled Overlay for unavailable templates */}
                {!isAvailable && (
                  <div className="absolute inset-0 bg-gray-900/30 opacity-100 flex items-center justify-center">
                    <div className="text-center">
                      <div className="bg-orange-500/90 text-white px-3 py-1.5 rounded-lg font-medium text-sm shadow-lg">
                        🚧 Coming Soon
                      </div>
                    </div>
                  </div>
                )}

                {/* Selected Indicator */}
                {isSelected && (
                  <div className="absolute top-3 right-3 w-6 h-6 bg-accent-primary rounded-full flex items-center justify-center">
                    <CheckIconSolid className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>

              {/* Template Info */}
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className={`font-semibold transition-colors ${
                      isAvailable 
                        ? 'text-dark-text-primary group-hover:text-accent-primary' 
                        : 'text-dark-text-secondary'
                    }`}>
                      {template.name}
                      {!isAvailable && (
                        <span className="ml-2 text-orange-400 text-sm font-normal">
                          (Coming Soon)
                        </span>
                      )}
                    </h3>
                    {template.id === 'template01' && isProduction && (
                      <div className="mt-1 text-xs text-green-400 font-medium">
                        ✅ Available Now
                      </div>
                    )}
                  </div>
                  <Badge
                    className={`bg-gradient-to-r ${config.gradient} text-white text-xs px-2 py-1 flex-shrink-0`}
                  >
                    {config.name}
                  </Badge>
                </div>
                
                <p className={`text-sm line-clamp-2 ${
                  isAvailable ? 'text-dark-text-secondary' : 'text-dark-text-muted'
                }`}>
                  {template.description}
                </p>
              </div>

              {/* Click to Select */}
              <div 
                className={`absolute inset-0 ${isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isAvailable) {
                    handleTemplateSelect(template.id);
                  } else {
                    handleTemplateSelect(template.id); // This will show the toast message
                  }
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