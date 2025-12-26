export interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  category: 'modern' | 'professional' | 'creative' | 'minimalist';
  colors: {
    primary: string;
    secondary: string;
    accent?: string;
    text: string;
    background: string;
  };
  fontStyle: 'modern' | 'classic' | 'serif';
  layout: 'single-column' | 'two-column' | 'creative';
  preview?: string;
}

export const resumeTemplates: ResumeTemplate[] = [
  {
    id: 'modern-creative-1',
    name: 'Modern Creative',
    description: 'A modern, creative template with vibrant colors and clean typography',
    category: 'modern',
    colors: {
      primary: '#3B82F6',
      secondary: '#10B981',
      accent: '#F59E0B',
      text: '#1F2937',
      background: '#FFFFFF'
    },
    fontStyle: 'modern',
    layout: 'single-column'
  },
  {
    id: 'professional-classic',
    name: 'Professional Classic',
    description: 'A traditional professional template perfect for corporate environments',
    category: 'professional',
    colors: {
      primary: '#1F2937',
      secondary: '#374151',
      accent: '#6B7280',
      text: '#111827',
      background: '#FFFFFF'
    },
    fontStyle: 'classic',
    layout: 'single-column'
  },
  {
    id: 'minimalist-clean',
    name: 'Minimalist Clean',
    description: 'A clean, minimalist design focusing on content over decoration',
    category: 'minimalist',
    colors: {
      primary: '#000000',
      secondary: '#6B7280',
      accent: '#9CA3AF',
      text: '#111827',
      background: '#FFFFFF'
    },
    fontStyle: 'modern',
    layout: 'single-column'
  },
  {
    id: 'creative-designer',
    name: 'Creative Designer',
    description: 'Bold and creative template perfect for designers and creative professionals',
    category: 'creative',
    colors: {
      primary: '#8B5CF6',
      secondary: '#EC4899',
      accent: '#F59E0B',
      text: '#1F2937',
      background: '#FFFFFF'
    },
    fontStyle: 'modern',
    layout: 'two-column'
  },
  {
    id: 'basic_sa',
    name: 'Basic SA',
    description: 'Optimized for South African entry-level and Grade 12 graduates.',
    category: 'minimalist',
    colors: {
      primary: '#004d99',
      secondary: '#505050',
      text: '#000000',
      background: '#FFFFFF'
    },
    fontStyle: 'classic',
    layout: 'single-column'
  }
];

export const getTemplateById = (id: string): ResumeTemplate | undefined => {
  return resumeTemplates.find(template => template.id === id);
};

export const getTemplatesByCategory = (category: ResumeTemplate['category']): ResumeTemplate[] => {
  return resumeTemplates.filter(template => template.category === category);
};