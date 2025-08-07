# LaTeX Resume Engine Setup Guide

## 🎯 Overview

This guide sets up a complete LaTeX compilation environment that mimics Overleaf's behavior for pixel-perfect CV generation.

## 📦 Required Dependencies

### System Requirements

#### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install -y texlive-full
sudo apt-get install -y imagemagick
sudo apt-get install -y poppler-utils
```

#### macOS
```bash
brew install --cask mactex
brew install imagemagick
brew install poppler
```

#### Windows
1. Install MiKTeX: https://miktex.org/download
2. Install ImageMagick: https://imagemagick.org/script/download.php#windows
3. Install Poppler: http://blog.alivate.com.au/poppler-windows/

### Node.js Dependencies
Add to your `package.json`:

```json
{
  "dependencies": {
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/uuid": "^9.0.0"
  }
}
```

## 🔧 Environment Setup

### 1. Create LaTeX Workspace
```bash
mkdir -p latex-workspace/{templates,output,compilation}
mkdir -p latex-workspace/templates/{overleaf-modern-cv,overleaf-classic-cv}
```

### 2. Verify Installation
Create a test script to verify LaTeX installation:

```bash
# Test XeLaTeX
echo "\\documentclass{article}\\begin{document}Hello LaTeX!\\end{document}" > test.tex
xelatex test.tex
```

### 3. ImageMagick Configuration
For PDF to image conversion, ensure ImageMagick policy allows PDF processing:

Edit `/etc/ImageMagick-6/policy.xml` (or similar path):
```xml
<!-- Comment out or modify this line -->
<!-- <policy domain="coder" rights="none" pattern="PDF" /> -->
<policy domain="coder" rights="read|write" pattern="PDF" />
```

## 🚀 Template Integration Workflow

### When You Provide an Overleaf Template:

1. **Share the Template**:
   - Send screenshot of the rendered CV
   - Provide the complete LaTeX source code
   - Include any custom .sty or .cls files
   - Mention any special fonts or packages used

2. **I'll Process It**:
   ```typescript
   await resumeService.installOverleafTemplate({
     id: 'overleaf-template-name',
     name: 'Template Display Name',
     description: 'Description from your analysis',
     category: 'modern', // or professional/creative/academic/minimalist
     latexSource: `\\documentclass[11pt]{article}...`, // Your LaTeX code
     styleFiles: {
       'custom.sty': '% Custom style definitions...',
       'fonts.sty': '% Font configurations...'
     }
   });
   ```

3. **Generate Preview**:
   ```typescript
   const preview = await resumeService.generateTemplatePreview('overleaf-template-name');
   ```

4. **Test with Real Data**:
   ```typescript
   const pdfBuffer = await resumeService.generateResumeFile(resumeData, 'pdf', {
     engine: 'latex',
     templateId: 'overleaf-template-name'
   });
   ```

## 📋 Template Requirements

Each Overleaf template must include:

### Required Placeholders:
- `{{firstName}}`, `{{lastName}}`, `{{fullName}}`
- `{{email}}`, `{{phone}}`, `{{location}}`
- `{{linkedinUrl}}`, `{{portfolioUrl}}`, `{{githubUrl}}`
- `{{professionalSummary}}`
- `{{workExperience}}` - Will be replaced with LaTeX itemize list
- `{{education}}` - Will be replaced with LaTeX itemize list
- `{{skills}}` - Will be replaced with categorized skills
- `{{certifications}}` - Will be replaced with LaTeX itemize list
- `{{projects}}` - Will be replaced with LaTeX itemize list

### File Structure:
```
latex-workspace/templates/template-id/
├── template.tex          # Main LaTeX file with placeholders
├── config.json          # Template metadata
├── preview.png          # High-res preview image
├── thumbnail.png        # Low-res thumbnail
├── custom.sty           # Custom style file (if needed)
└── fonts/               # Custom fonts (if needed)
```

## 🔍 Quality Assurance

### Validation Checklist:
- [ ] LaTeX compiles without errors
- [ ] All placeholders are properly replaced
- [ ] Fonts render correctly
- [ ] Layout matches Overleaf exactly
- [ ] PDF output is identical to screenshot
- [ ] No character encoding issues
- [ ] Special characters are properly escaped

### Testing Process:
1. Install template with sample data
2. Generate PDF and compare with screenshot
3. Test with various data combinations
4. Verify cross-platform compatibility
5. Test font fallbacks

## 🎨 Template Categories

### Modern
- Clean typography
- Color accents
- Modern layout elements
- Sans-serif fonts

### Professional
- Conservative design
- Minimal colors
- Traditional layout
- Serif fonts

### Creative
- Unique layouts
- Bold typography
- Creative elements
- Mixed fonts

### Academic
- Publication-focused
- Research emphasis
- Classical design
- Serif fonts

### Minimalist
- Maximum white space
- Simple typography
- Clean lines
- Minimal elements

## 🚀 Ready for Templates!

The system is now ready. When you provide:
1. **Screenshot** of the Overleaf template
2. **Complete LaTeX source code**
3. **Any custom files** (.sty, fonts, etc.)

I will:
1. Analyze the template structure
2. Install it in the system
3. Generate pixel-perfect PDFs
4. Ensure 100% fidelity to Overleaf output

Let's start with your first template! 📄✨