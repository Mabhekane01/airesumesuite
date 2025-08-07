# Standardized Template System

## Overview

The Standardized Template System is a hybrid approach that combines the reliability of deterministic template rendering with the power of AI content enhancement. This system was developed to address the limitations of pure AI-generated LaTeX while maintaining scalability and user customization.

## Architecture

### Core Principles

1. **AI for Content, Not Structure**: AI enhances text content (summaries, achievements) but doesn't generate LaTeX structure
2. **Deterministic Rendering**: Template structure and placeholders are handled by reliable string replacement
3. **Backward Compatibility**: Falls back to original templates if standardized versions don't exist
4. **Scalable**: Supports unlimited templates without needing to retrain or update AI prompts

### File Structure

```
apps/frontend/public/templates/
├── template-config-schema.json          # JSON Schema for configurations
├── base-standardized-template.tex       # Generic base template
├── template01/
│   ├── templatecode.txt                 # Original template (unchanged)
│   ├── template01-standardized.tex     # New standardized version
│   ├── template01-config.json          # Template configuration
│   └── 23504.jpeg                      # Screenshot (unchanged)
├── template02/
│   ├── templatecode.txt
│   ├── template02-standardized.tex     # To be created
│   ├── template02-config.json          # To be created
│   └── screenshot.jpeg
└── ...
```

## Frontend Data Structure

The system uses the existing frontend `Resume` interface from `apps/frontend/src/types/index.ts`:

```typescript
interface Resume {
  personalInfo: PersonalInfo;
  professionalSummary: string;
  workExperience: WorkExperience[];
  education: Education[];
  skills: Skill[];
  projects: Project[];
  certifications: Certification[];
  languages: Language[];
  volunteerExperience: VolunteerExperience[];
  awards: Award[];
  publications: Publication[];
  references: Reference[];
  hobbies: Hobby[];
  additionalSections: AdditionalSection[];
}
```

## Template Placeholders

### Personal Information
- `{{FIRST_NAME}}` - User's first name
- `{{LAST_NAME}}` - User's last name
- `{{EMAIL}}` - Email address
- `{{PHONE}}` - Phone number
- `{{LOCATION}}` - Location/address
- `{{PROFESSIONAL_TITLE}}` - Job title/professional title
- `{{LINKEDIN}}` - LinkedIn profile URL
- `{{GITHUB}}` - GitHub profile URL
- `{{PORTFOLIO}}` - Portfolio website URL
- `{{WEBSITE}}` - Personal website URL

### Content Sections
- `{{PROFESSIONAL_SUMMARY}}` - Professional summary text
- `{{WORK_EXPERIENCE}}` - Rendered work experience section
- `{{EDUCATION}}` - Rendered education section
- `{{SKILLS}}` - Rendered skills section
- `{{PROJECTS}}` - Rendered projects section
- `{{CERTIFICATIONS}}` - Rendered certifications section
- `{{LANGUAGES}}` - Rendered languages section
- `{{VOLUNTEER_EXPERIENCE}}` - Rendered volunteer experience section
- `{{AWARDS}}` - Rendered awards section
- `{{PUBLICATIONS}}` - Rendered publications section
- `{{REFERENCES}}` - Rendered references section
- `{{HOBBIES}}` - Rendered hobbies/interests section
- `{{ADDITIONAL_SECTIONS}}` - Custom user-defined sections

### Conditional Rendering

Sections can be conditionally included based on user data:

```latex
{{#IF_WORK_EXPERIENCE}}
\section*{PROFESSIONAL EXPERIENCE}
{{WORK_EXPERIENCE}}
{{/IF_WORK_EXPERIENCE}}
```

Available conditional tags:
- `{{#IF_PROFESSIONAL_TITLE}}...{{/IF_PROFESSIONAL_TITLE}}`
- `{{#IF_LOCATION}}...{{/IF_LOCATION}}`
- `{{#IF_LINKEDIN}}...{{/IF_LINKEDIN}}`
- `{{#IF_GITHUB}}...{{/IF_GITHUB}}`
- `{{#IF_PORTFOLIO}}...{{/IF_PORTFOLIO}}`
- `{{#IF_WEBSITE}}...{{/IF_WEBSITE}}`
- `{{#IF_WORK_EXPERIENCE}}...{{/IF_WORK_EXPERIENCE}}`
- `{{#IF_EDUCATION}}...{{/IF_EDUCATION}}`
- `{{#IF_SKILLS}}...{{/IF_SKILLS}}`
- `{{#IF_PROJECTS}}...{{/IF_PROJECTS}}`
- `{{#IF_CERTIFICATIONS}}...{{/IF_CERTIFICATIONS}}`
- `{{#IF_LANGUAGES}}...{{/IF_LANGUAGES}}`
- `{{#IF_VOLUNTEER_EXPERIENCE}}...{{/IF_VOLUNTEER_EXPERIENCE}}`
- `{{#IF_AWARDS}}...{{/IF_AWARDS}}`
- `{{#IF_PUBLICATIONS}}...{{/IF_PUBLICATIONS}}`
- `{{#IF_REFERENCES}}...{{/IF_REFERENCES}}`
- `{{#IF_HOBBIES}}...{{/IF_HOBBIES}}`
- `{{#IF_ADDITIONAL_SECTIONS}}...{{/IF_ADDITIONAL_SECTIONS}}`

## Template Configuration

Each standardized template includes a configuration file (`templateXX-config.json`):

```json
{
  "templateId": "template01",
  "templateName": "Anti-CV Creative Template",
  "description": "A unique creative template...",
  "category": "creative",
  "tags": ["single-column", "creative", "unique"],
  "isStandardized": true,
  "requiredFields": [
    "personalInfo.firstName",
    "personalInfo.lastName",
    "personalInfo.email",
    "personalInfo.phone",
    "professionalSummary"
  ],
  "optionalFields": [
    "personalInfo.professionalTitle",
    "workExperience",
    "education"
  ],
  "compilationSettings": {
    "compiler": "pdflatex",
    "passes": 2,
    "specialPackages": ["tikz", "xcolor"]
  }
}
```

## Usage

### Backend Service

The `StandardizedTemplateService` handles template rendering:

```typescript
import { standardizedTemplateService } from './standardizedTemplateService';

const latex = await standardizedTemplateService.generateLatex(
  'template01',
  resumeData,
  {
    enhanceWithAI: true,
    jobDescription: 'Optional job description for optimization'
  }
);
```

### Template Priority

1. **Standardized Template**: `templateXX-standardized.tex` (highest priority)
2. **Original Template**: `templatecode.txt` (fallback)
3. **Error**: If neither exists

### AI Enhancement

AI is used only for content enhancement:
- Professional summary optimization
- Achievement descriptions improvement
- Keyword optimization for ATS compatibility

AI does NOT:
- Generate LaTeX structure
- Handle template layouts
- Manage conditional sections

## Creating New Standardized Templates

### Method 1: Use the Utility Script

```bash
node create-standardized-templates.js
```

This script will:
1. Analyze existing templates
2. Generate standardized versions with placeholders
3. Create configuration files
4. Preserve original templates

### Method 2: Manual Creation

1. Copy `base-standardized-template.tex` as starting point
2. Adapt the LaTeX styling from original template
3. Replace content with standardized placeholders
4. Create corresponding configuration file
5. Test with various user data scenarios

### Template Development Guidelines

1. **Preserve Visual Style**: Keep the original template's visual appearance
2. **Use Standard Placeholders**: Follow the established placeholder naming
3. **Handle Optional Sections**: Use conditional tags for optional content
4. **LaTeX Compatibility**: Ensure compilation with standard LaTeX engines
5. **Test Thoroughly**: Verify with minimal, complete, and edge-case data

## Testing

Run the test suite to verify template functionality:

```bash
node test-standardized-templates.js
```

Tests cover:
- Placeholder replacement
- Conditional section rendering
- Configuration validation
- Multiple user data scenarios

## Benefits

### Scalability
- ✅ Works with unlimited number of templates
- ✅ No need to update AI prompts for new templates
- ✅ Easy to add new placeholder types

### Reliability
- ✅ Deterministic output - same input always produces same result
- ✅ No AI-generated LaTeX syntax errors
- ✅ Predictable compilation success

### Performance
- ✅ Fast rendering (string replacement vs AI generation)
- ✅ Cacheable results
- ✅ Reduced API calls to AI services

### Flexibility
- ✅ Easy to customize templates
- ✅ Maintains original template designs
- ✅ Supports complex conditional logic

## Migration Path

For existing systems:
1. Keep original templates unchanged
2. Create standardized versions alongside originals
3. Update `StandardizedTemplateService` to prioritize standardized versions
4. Gradually migrate templates to standardized format
5. AI service becomes content-enhancement only

## Future Enhancements

1. **Template Marketplace**: Allow users to upload custom standardized templates
2. **Visual Editor**: GUI for creating standardized templates
3. **A/B Testing**: Compare AI-generated vs standardized template performance
4. **Advanced Conditionals**: Support for complex conditional logic
5. **Multi-language Support**: Standardized templates in multiple languages

## Troubleshooting

### Common Issues

1. **Template Not Found**: Ensure both `templateXX-standardized.tex` and `templateXX-config.json` exist
2. **Placeholder Not Replaced**: Check placeholder spelling and case sensitivity
3. **Conditional Section Not Working**: Verify `{{#IF_SECTION}}...{{/IF_SECTION}}` syntax
4. **LaTeX Compilation Error**: Check for unescaped special characters

### Debug Mode

Enable debug logging in `StandardizedTemplateService`:

```typescript
console.log('🔍 Template rendering debug info:', {
  templateId,
  hasStandardizedVersion: boolean,
  placeholdersReplaced: number,
  conditionalSectionsProcessed: number
});
```

## Support

For issues with the standardized template system:
1. Check this documentation
2. Run the test suite to verify system functionality
3. Review template configuration files
4. Check LaTeX compilation logs
5. Open GitHub issue with template ID and error details