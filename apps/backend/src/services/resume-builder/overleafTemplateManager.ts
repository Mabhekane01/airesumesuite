import fs from 'fs/promises';
import path from 'path';
import { latexService, LaTeXTemplateData } from './latexService';

export interface OverleafTemplate {
  id: string;
  name: string;
  description: string;
  category: 'modern' | 'professional' | 'creative' | 'academic' | 'minimalist';
  preview: {
    screenshotUrl: string;
    thumbnailUrl: string;
  };
  metadata: {
    author: string;
    version: string;
    lastModified: string;
    overleafUrl?: string;
  };
  latexFiles: {
    main: string;        // Main .tex file
    styles: string[];    // Style files (.sty, .cls)
    fonts: string[];     // Font files
    images: string[];    // Image assets
  };
  customizations: {
    colorSchemes: string[];
    fontOptions: string[];
    layoutVariants: string[];
  };
  compatibility: {
    xelatex: boolean;
    pdflatex: boolean;
    lualatex: boolean;
  };
}

export class OverleafTemplateManager {
  private readonly templatesDir: string;
  private templates: Map<string, OverleafTemplate> = new Map();

  constructor() {
    this.templatesDir = path.join(process.cwd(), 'latex-workspace', 'templates');
    this.loadTemplates();
  }

  /**
   * Load all available Overleaf templates
   */
  private async loadTemplates(): Promise<void> {
    try {
      await fs.mkdir(this.templatesDir, { recursive: true });
      
      // Load template registry
      const registryPath = path.join(this.templatesDir, 'registry.json');
      
      try {
        const registryData = await fs.readFile(registryPath, 'utf8');
        const registry = JSON.parse(registryData);
        
        for (const templateConfig of registry.templates) {
          this.templates.set(templateConfig.id, templateConfig);
        }
        
        console.log(`✅ Loaded ${this.templates.size} Overleaf templates`);
      } catch (error) {
        console.log('📝 No template registry found, creating default templates');
        await this.createDefaultTemplates();
      }
    } catch (error) {
      console.error('❌ Failed to load templates:', error);
    }
  }

  /**
   * Get all available templates
   */
  getAvailableTemplates(): OverleafTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): OverleafTemplate | null {
    return this.templates.get(templateId) || null;
  }

  /**
   * Install new Overleaf template from LaTeX source
   */
  async installOverleafTemplate(
    templateData: {
      id: string;
      name: string;
      description: string;
      category: OverleafTemplate['category'];
      latexSource: string;
      styleFiles?: { [filename: string]: string };
      metadata?: Partial<OverleafTemplate['metadata']>;
    }
  ): Promise<void> {
    const templateDir = path.join(this.templatesDir, templateData.id);
    
    try {
      // Create template directory
      await fs.mkdir(templateDir, { recursive: true });
      
      // Write main LaTeX file
      await fs.writeFile(
        path.join(templateDir, 'template.tex'),
        templateData.latexSource,
        'utf8'
      );
      
      // Write style files
      if (templateData.styleFiles) {
        for (const [filename, content] of Object.entries(templateData.styleFiles)) {
          await fs.writeFile(
            path.join(templateDir, filename),
            content,
            'utf8'
          );
        }
      }
      
      // Create template configuration
      const template: OverleafTemplate = {
        id: templateData.id,
        name: templateData.name,
        description: templateData.description,
        category: templateData.category,
        preview: {
          screenshotUrl: `templates/${templateData.id}/preview.png`,
          thumbnailUrl: `templates/${templateData.id}/thumbnail.png`
        },
        metadata: {
          author: templateData.metadata?.author || 'Unknown',
          version: '1.0.0',
          lastModified: new Date().toISOString(),
          ...templateData.metadata
        },
        latexFiles: {
          main: 'template.tex',
          styles: Object.keys(templateData.styleFiles || {}),
          fonts: [],
          images: []
        },
        customizations: {
          colorSchemes: ['default'],
          fontOptions: ['default'],
          layoutVariants: ['default']
        },
        compatibility: {
          xelatex: true,
          pdflatex: true,
          lualatex: false
        }
      };
      
      // Save template configuration
      await fs.writeFile(
        path.join(templateDir, 'config.json'),
        JSON.stringify(template, null, 2),
        'utf8'
      );
      
      // Add to memory cache
      this.templates.set(templateData.id, template);
      
      // Update registry
      await this.updateTemplateRegistry();
      
      console.log(`✅ Successfully installed Overleaf template: ${templateData.name}`);
      
    } catch (error) {
      console.error(`❌ Failed to install template ${templateData.id}:`, error);
      throw error;
    }
  }

  /**
   * Generate preview image for template
   */
  async generateTemplatePreview(
    templateId: string,
    sampleData: LaTeXTemplateData
  ): Promise<{ screenshot: Buffer; thumbnail: Buffer }> {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    try {
      // Compile template with sample data
      const pdfBuffer = await latexService.compileResume(sampleData, {
        templateId,
        outputFormat: 'pdf',
        cleanup: true
      });
      
      // For now, use placeholder images since convertPDFToImage is private
      // TODO: Implement public image conversion method in latexService
      const screenshot = Buffer.from('placeholder-screenshot');
      const thumbnail = Buffer.from('placeholder-thumbnail');
      
      console.log('📸 Image conversion temporarily disabled - using placeholders');
      
      // Save preview images
      const templateDir = path.join(this.templatesDir, templateId);
      await fs.writeFile(path.join(templateDir, 'preview.png'), screenshot);
      await fs.writeFile(path.join(templateDir, 'thumbnail.png'), thumbnail);
      
      console.log(`✅ Generated preview for template: ${templateId}`);
      
      return { screenshot, thumbnail };
      
    } catch (error) {
      console.error(`❌ Failed to generate preview for ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Validate LaTeX template for common issues
   */
  async validateTemplate(templateId: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const template = this.getTemplate(templateId);
    if (!template) {
      return {
        valid: false,
        errors: [`Template ${templateId} not found`],
        warnings: []
      };
    }
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      const templateDir = path.join(this.templatesDir, templateId);
      const mainTexPath = path.join(templateDir, template.latexFiles.main);
      
      // Check if main file exists
      try {
        await fs.access(mainTexPath);
      } catch {
        errors.push(`Main LaTeX file not found: ${template.latexFiles.main}`);
      }
      
      // Read and analyze LaTeX content
      const texContent = await fs.readFile(mainTexPath, 'utf8');
      
      // Check for required placeholders
      const requiredPlaceholders = [
        '{{firstName}}', '{{lastName}}', '{{email}}', '{{phone}}',
        '{{workExperience}}', '{{education}}', '{{skills}}'
      ];
      
      for (const placeholder of requiredPlaceholders) {
        if (!texContent.includes(placeholder)) {
          warnings.push(`Missing placeholder: ${placeholder}`);
        }
      }
      
      // Check for problematic LaTeX constructs
      if (texContent.includes('\\input{') && !texContent.includes('\\InputIfFileExists{')) {
        warnings.push('Using \\input without existence check may cause compilation errors');
      }
      
      // Check document class
      if (!texContent.includes('\\documentclass')) {
        errors.push('No \\documentclass declaration found');
      }
      
      // Check for begin/end document
      if (!texContent.includes('\\begin{document}') || !texContent.includes('\\end{document}')) {
        errors.push('Missing \\begin{document} or \\end{document}');
      }
      
    } catch (error) {
      errors.push(`Failed to validate template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create sample data for template testing
   */
  createSampleData(): LaTeXTemplateData {
    return {
      personalInfo: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1 (555) 123-4567',
        location: 'New York, NY',
        linkedinUrl: 'https://linkedin.com/in/johndoe',
        portfolioUrl: 'https://johndoe.dev',
        githubUrl: 'https://github.com/johndoe'
      },
      professionalSummary: 'Experienced software engineer with 5+ years of expertise in full-stack development, cloud architecture, and team leadership. Proven track record of delivering scalable solutions and driving technical innovation.',
      workExperience: [
        {
          jobTitle: 'Senior Software Engineer',
          company: 'Tech Corp',
          location: 'San Francisco, CA',
          startDate: 'Jan 2020',
          endDate: 'Present',
          isCurrentJob: true,
          achievements: [
            'Led development of microservices architecture serving 1M+ users',
            'Improved system performance by 40% through optimization initiatives',
            'Mentored junior developers and established coding standards'
          ],
          responsibilities: [
            'Designed and implemented scalable backend systems',
            'Mentored junior developers and established coding standards'
          ]
        },
        {
          jobTitle: 'Software Engineer',
          company: 'StartupXYZ',
          location: 'Austin, TX',
          startDate: 'Jun 2018',
          endDate: 'Dec 2019',
          isCurrentJob: false,
          achievements: [
            'Built real-time analytics dashboard using React and Node.js',
            'Implemented CI/CD pipelines reducing deployment time by 60%',
            'Collaborated with product team to define technical requirements'
          ],
          responsibilities: [
            'Developed full-stack web applications',
            'Collaborated with product team to define technical requirements'
          ]
        }
      ],
      education: [
        {
          degree: 'Bachelor of Science in Computer Science',
          institution: 'University of Technology',
          fieldOfStudy: 'Computer Science',
          location: 'Boston, MA',
          graduationDate: 'May 2018',
          gpa: '3.8/4.0'
        }
      ],
      skills: [
        { name: 'JavaScript', category: 'technical' },
        { name: 'Python', category: 'technical' },
        { name: 'React', category: 'technical' },
        { name: 'Node.js', category: 'technical' },
        { name: 'AWS', category: 'technical' },
        { name: 'Docker', category: 'technical' }
      ],
      certifications: [
        { name: 'AWS Certified Solutions Architect', issuer: 'Amazon Web Services', date: '2023' },
        { name: 'Google Cloud Professional Developer', issuer: 'Google Cloud', date: '2023' }
      ],
      projects: [
        {
          name: 'E-commerce Platform',
          description: ['Full-stack web application with payment processing and inventory management'],
          technologies: ['React', 'Node.js', 'PostgreSQL', 'Stripe API'],
          url: 'https://github.com/johndoe/ecommerce'
        }
      ]
    };
  }

  /**
   * Update template registry file
   */
  private async updateTemplateRegistry(): Promise<void> {
    const registry = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      templates: Array.from(this.templates.values())
    };
    
    const registryPath = path.join(this.templatesDir, 'registry.json');
    await fs.writeFile(registryPath, JSON.stringify(registry, null, 2), 'utf8');
  }

  /**
   * Create default templates for initial setup
   */
  private async createDefaultTemplates(): Promise<void> {
    // This will be expanded as we add each Overleaf template
    const defaultTemplates = [
      {
        id: 'overleaf-modern-cv',
        name: 'Modern CV (Overleaf)',
        description: 'Clean and modern CV template from Overleaf',
        category: 'modern' as const
      }
    ];
    
    for (const template of defaultTemplates) {
      console.log(`📝 Creating default template: ${template.name}`);
      // Template installation will be done when you provide the LaTeX source
    }
  }
}

export const overleafTemplateManager = new OverleafTemplateManager();