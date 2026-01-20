/**
 * AI Content Enhancer for Standardized Templates
 * 
 * This service enhances resume content without generating LaTeX code.
 * It works with the standardized template system by improving text content
 * that gets inserted into template placeholders.
 */

import { enterpriseAIService } from "../ai/enterpriseAIService";

export interface EnhancementOptions {
  jobDescription?: string;
  targetRole?: string;
  industry?: string;
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  keywords?: string[];
  tone?: 'professional' | 'casual' | 'academic' | 'creative';
}

export interface ContentEnhancementResult {
  originalContent: any;
  enhancedContent: any;
  improvements: string[];
  atsScore?: number;
  keywordsAdded?: string[];
}

export interface ResumeData {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
    professionalTitle?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
    githubUrl?: string;
    websiteUrl?: string;
  };
  professionalSummary: string;
  workExperience: Array<{
    id?: string;
    jobTitle: string;
    company: string;
    location: string;
    startDate: string;
    endDate?: string;
    isCurrentJob: boolean;
    responsibilities: string[];
    achievements: string[];
  }>;
  education: Array<{
    id?: string;
    institution: string;
    degree: string;
    fieldOfStudy: string;
    graduationDate: string;
    startDate: string;
    endDate?: string;
    location?: string;
    gpa?: string;
    coursework?: string[];
  }>;
  skills: Array<{
    id?: string;
    name: string;
    category: 'technical' | 'soft' | 'language' | 'certification';
    proficiencyLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  }>;
  projects?: Array<{
    id?: string;
    name: string;
    description: string[];
    technologies: string[];
    url?: string;
    startDate?: string;
    endDate?: string;
  }>;
  certifications?: Array<{
    id?: string;
    name: string;
    issuer: string;
    date: string;
    expirationDate?: string;
    credentialId?: string;
    url?: string;
  }>;
  languages?: Array<{
    id?: string;
    name: string;
    proficiency: 'native' | 'fluent' | 'conversational' | 'basic';
  }>;
  volunteerExperience?: Array<{
    id?: string;
    organization: string;
    role: string;
    location: string;
    startDate: string;
    endDate?: string;
    isCurrentRole: boolean;
    description: string;
    achievements: string[];
  }>;
  awards?: Array<{
    id?: string;
    title: string;
    issuer: string;
    date: string;
    description?: string;
  }>;
  publications?: Array<{
    id?: string;
    title: string;
    publisher: string;
    publicationDate: string;
    url?: string;
    description?: string;
  }>;
  references?: Array<{
    id?: string;
    name: string;
    title: string;
    company: string;
    email: string;
    phone: string;
    relationship: string;
  }>;
  hobbies?: Array<{
    id?: string;
    name: string;
    description?: string;
    category: 'creative' | 'sports' | 'technology' | 'volunteer' | 'other';
  }>;
  additionalSections?: Array<{
    title: string;
    content: string;
  }>;
}

export class AIContentEnhancer {
  constructor() {
    // Use the shared enterprise AI service
  }

  /**
   * Enhance entire resume content for standardized templates
   */
  async enhanceResumeContent(
    resumeData: ResumeData,
    options: EnhancementOptions = {}
  ): Promise<ContentEnhancementResult> {
    try {
      console.log('🤖 Enhancing resume content with AI...');
      
      const enhancedContent = { ...resumeData };
      const improvements: string[] = [];
      const keywordsAdded: string[] = [];

      // 1. Enhance Professional Summary
      if (resumeData.professionalSummary) {
        try {
          const enhancedSummary = await this.enhanceProfessionalSummary(
            resumeData.professionalSummary,
            options
          );
          enhancedContent.professionalSummary = enhancedSummary.content;
          improvements.push(...enhancedSummary.improvements);
          keywordsAdded.push(...enhancedSummary.keywords);
        } catch (error) {
          console.warn('Professional summary enhancement skipped:', error);
          improvements.push('Professional summary enhancement skipped due to AI response issues');
        }
      }

      // 2. Enhance Work Experience
      if (resumeData.workExperience && resumeData.workExperience.length > 0) {
        try {
          const enhancedWork = await this.enhanceWorkExperience(
            resumeData.workExperience,
            options
          );
          enhancedContent.workExperience = enhancedWork.content;
          improvements.push(...enhancedWork.improvements);
          keywordsAdded.push(...enhancedWork.keywords);
        } catch (error) {
          console.warn('Work experience enhancement skipped:', error);
          improvements.push('Work experience enhancement skipped due to AI response issues');
        }
      }

      // 3. Enhance Education
      if (resumeData.education && resumeData.education.length > 0) {
        try {
          const enhancedEducation = await this.enhanceEducation(
            resumeData.education,
            options
          );
          enhancedContent.education = enhancedEducation.content;
          improvements.push(...enhancedEducation.improvements);
          keywordsAdded.push(...enhancedEducation.keywords);
        } catch (error) {
          console.warn('Education enhancement skipped:', error);
          improvements.push('Education enhancement skipped due to AI response issues');
        }
      }

      // 4. Enhance Skills
      if (resumeData.skills && resumeData.skills.length > 0) {
        try {
          const enhancedSkills = await this.enhanceSkills(
            resumeData.skills,
            options
          );
          enhancedContent.skills = enhancedSkills.content;
          improvements.push(...enhancedSkills.improvements);
          keywordsAdded.push(...enhancedSkills.keywords);
        } catch (error) {
          console.warn('Skills enhancement skipped:', error);
          improvements.push('Skills enhancement skipped due to AI response issues');
        }
      }

      // 5. Enhance Project Descriptions
      if (resumeData.projects && resumeData.projects.length > 0) {
        try {
          const enhancedProjects = await this.enhanceProjects(
            resumeData.projects,
            options
          );
          enhancedContent.projects = enhancedProjects.content;
          improvements.push(...enhancedProjects.improvements);
          keywordsAdded.push(...enhancedProjects.keywords);
        } catch (error) {
          console.warn('Project enhancement skipped:', error);
          improvements.push('Project enhancement skipped due to AI response issues');
        }
      }

      // 6. Enhance Certifications
      if (resumeData.certifications && resumeData.certifications.length > 0) {
        try {
          const enhancedCertifications = await this.enhanceCertifications(
            resumeData.certifications,
            options
          );
          enhancedContent.certifications = enhancedCertifications.content;
          improvements.push(...enhancedCertifications.improvements);
          keywordsAdded.push(...enhancedCertifications.keywords);
        } catch (error) {
          console.warn('Certifications enhancement skipped:', error);
          improvements.push('Certifications enhancement skipped due to AI response issues');
        }
      }

      // 7. Enhance Languages
      if (resumeData.languages && resumeData.languages.length > 0) {
        try {
          const enhancedLanguages = await this.enhanceLanguages(
            resumeData.languages,
            options
          );
          enhancedContent.languages = enhancedLanguages.content;
          improvements.push(...enhancedLanguages.improvements);
          keywordsAdded.push(...enhancedLanguages.keywords);
        } catch (error) {
          console.warn('Languages enhancement skipped:', error);
          improvements.push('Languages enhancement skipped due to AI response issues');
        }
      }

      // 8. Enhance Volunteer Experience
      if (resumeData.volunteerExperience && resumeData.volunteerExperience.length > 0) {
        try {
          const enhancedVolunteer = await this.enhanceVolunteerExperience(
            resumeData.volunteerExperience,
            options
          );
          enhancedContent.volunteerExperience = enhancedVolunteer.content;
          improvements.push(...enhancedVolunteer.improvements);
          keywordsAdded.push(...enhancedVolunteer.keywords);
        } catch (error) {
          console.warn('Volunteer experience enhancement skipped:', error);
          improvements.push('Volunteer experience enhancement skipped due to AI response issues');
        }
      }

      // 9. Enhance Awards
      if (resumeData.awards && resumeData.awards.length > 0) {
        try {
          const enhancedAwards = await this.enhanceAwards(
            resumeData.awards,
            options
          );
          enhancedContent.awards = enhancedAwards.content;
          improvements.push(...enhancedAwards.improvements);
          keywordsAdded.push(...enhancedAwards.keywords);
        } catch (error) {
          console.warn('Awards enhancement skipped:', error);
          improvements.push('Awards enhancement skipped due to AI response issues');
        }
      }

      // 10. Enhance Publications
      if (resumeData.publications && resumeData.publications.length > 0) {
        try {
          const enhancedPublications = await this.enhancePublications(
            resumeData.publications,
            options
          );
          enhancedContent.publications = enhancedPublications.content;
          improvements.push(...enhancedPublications.improvements);
          keywordsAdded.push(...enhancedPublications.keywords);
        } catch (error) {
          console.warn('Publications enhancement skipped:', error);
          improvements.push('Publications enhancement skipped due to AI response issues');
        }
      }

      // 11. Enhance References
      if (resumeData.references && resumeData.references.length > 0) {
        try {
          const enhancedReferences = await this.enhanceReferences(
            resumeData.references,
            options
          );
          enhancedContent.references = enhancedReferences.content;
          improvements.push(...enhancedReferences.improvements);
          keywordsAdded.push(...enhancedReferences.keywords);
        } catch (error) {
          console.warn('References enhancement skipped:', error);
          improvements.push('References enhancement skipped due to AI response issues');
        }
      }

      // 12. Enhance Hobbies
      if (resumeData.hobbies && resumeData.hobbies.length > 0) {
        try {
          const enhancedHobbies = await this.enhanceHobbies(
            resumeData.hobbies,
            options
          );
          enhancedContent.hobbies = enhancedHobbies.content;
          improvements.push(...enhancedHobbies.improvements);
          keywordsAdded.push(...enhancedHobbies.keywords);
        } catch (error) {
          console.warn('Hobbies enhancement skipped:', error);
          improvements.push('Hobbies enhancement skipped due to AI response issues');
        }
      }

      // 13. Enhance Additional Sections
      if (resumeData.additionalSections && resumeData.additionalSections.length > 0) {
        try {
          const enhancedAdditional = await this.enhanceAdditionalSections(
            resumeData.additionalSections,
            options
          );
          enhancedContent.additionalSections = enhancedAdditional.content;
          improvements.push(...enhancedAdditional.improvements);
          keywordsAdded.push(...enhancedAdditional.keywords);
        } catch (error) {
          console.warn('Additional sections enhancement skipped:', error);
          improvements.push('Additional sections enhancement skipped due to AI response issues');
        }
      }

      // 14. Calculate ATS Score using real AI analysis
      // We perform this on the ENHANCED content to see the final score
      console.log('🛡️ Performing final AI ATS analysis...');
      let atsScore = 0;
      try {
        const atsAnalysis = await enterpriseAIService.analyzeATSCompatibility(
          enhancedContent, 
          options.jobDescription
        );
        atsScore = atsAnalysis.score;
        console.log(`✅ AI ATS Analysis complete. Score: ${atsScore}%`);
      } catch (atsError) {
        console.error('❌ AI ATS Analysis failed:', atsError);
        atsScore = 0;
        improvements.push('ATS analysis unavailable due to AI response issues');
      }

      console.log(`✅ Content enhancement complete. Final ATS Score: ${atsScore}%`);
      
      return {
        originalContent: resumeData,
        enhancedContent,
        improvements,
        atsScore,
        keywordsAdded,
      };

    } catch (error) {
      console.error('❌ AI content enhancement failed:', error);
      throw error;
    }
  }

  /**
   * Enhance professional summary for better impact and ATS compatibility
   */
  private async enhanceProfessionalSummary(
    originalSummary: string,
    options: EnhancementOptions
  ): Promise<{ content: string; improvements: string[]; keywords: string[] }> {
    if (!originalSummary) {
      return { content: originalSummary, improvements: [], keywords: [] };
    }

    try {
      const toneGuidance = this.getToneGuidance(options);
      const prompt = `
You are an Elite Executive Resume Architect. Your task is to transform a standard professional summary into a high-impact 'Executive Abstract' that commands attention and outranks competitors in ATS systems.

ORIGINAL SUMMARY ASSET:
"${originalSummary}"

STRATEGIC ENHANCEMENT VECTORS:
${options.jobDescription ? `- Alignment Target (Job Description): ${options.jobDescription.substring(0, 500)}` : ''}
${options.targetRole ? `- Leadership/Role Context: ${options.targetRole}` : ''}
${options.industry ? `- Sector Intelligence: ${options.industry}` : ''}
${options.experienceLevel ? `- Seniority Calibration: ${options.experienceLevel}` : ''}
${options.keywords ? `- Critical Semantic Nodes (Keywords): ${options.keywords.join(', ')}` : ''}

REQUIRED EXECUTION:
1. COMPOSITION: Synthesize exactly 3-4 powerful sentences.
2. IMPACT: Start with a definitive statement of expertise and years of mastery.
3. QUANTIFICATION: Integrate specific, high-level achievements or scale of impact.
4. ATS ARCHITECTURE: Seamlessly integrate primary technical and industry keywords.
5. TONE: Maintain an elite, authoritative, and results-driven professional voice.
${toneGuidance}

CRITICAL CONSTRAINTS:
- Use PLAIN TEXT ONLY.
- STREICTLY FORBIDDEN: Markdown bold (**), italics (*), or any special formatting symbols.
- DO NOT provide explanations, headers, or metadata. Return ONLY the enhanced abstract string.

Enhanced Executive Abstract:`;

      const enhancedSummary = await enterpriseAIService.generateText(prompt, 'summary-generation');

      // Clean any markdown formatting that might have slipped through
      const cleanedSummary = this.cleanMarkdownFormatting(enhancedSummary);

      // Extract improvements and keywords
      const improvements = this.identifyImprovements(originalSummary, cleanedSummary);
      const keywords = this.extractKeywords(cleanedSummary, options);

      return {
        content: cleanedSummary,
        improvements,
        keywords,
      };

    } catch (error) {
      console.error('Failed to enhance professional summary:', error);
      throw error;
    }
  }

  /**
   * Enhance work experience entries for better impact
   */
  private async enhanceWorkExperience(
    workExperience: any[],
    options: EnhancementOptions
  ): Promise<{ content: any[]; improvements: string[]; keywords: string[] }> {
    if (!workExperience.length) {
      return { content: workExperience, improvements: [], keywords: [] };
    }

    try {
      const enhancedExperience = [];
      const allImprovements: string[] = [];
      const allKeywords: string[] = [];

      for (const experience of workExperience) {
        const enhanced = await this.enhanceSingleWorkExperience(experience, options);
        enhancedExperience.push(enhanced.content);
        allImprovements.push(...enhanced.improvements);
        allKeywords.push(...enhanced.keywords);
      }

      return {
        content: enhancedExperience,
        improvements: allImprovements,
        keywords: allKeywords,
      };

    } catch (error) {
      console.error('Failed to enhance work experience:', error);
      throw error;
    }
  }

  /**
   * Enhance a single work experience entry
   */
  private async enhanceSingleWorkExperience(
    experience: any,
    options: EnhancementOptions
  ): Promise<{ content: any; improvements: string[]; keywords: string[] }> {
    try {
      const toneGuidance = this.getToneGuidance(options);
      const responsibilitiesText = experience.responsibilities?.join('\n- ') || '';
      const achievementsText = experience.achievements?.join('\n- ') || '';

      const prompt = `
You are a Principal Talent Strategist. Transform these standard work experience entries into a high-performance 'Professional Impact Node' that highlights technical mastery and leadership value.

NODE CONTEXT: ${experience.jobTitle} at ${experience.company}
CURRENT INPUTS:
- Responsibilities: ${responsibilitiesText}
- Achievements: ${achievementsText}

STRATEGIC ALIGNMENT VECTORS:
${options.jobDescription ? `- Target Role Blueprint: ${options.jobDescription.substring(0, 300)}` : ''}
${options.keywords ? `- Critical Semantic Nodes: ${options.keywords.join(', ')}` : ''}

REQUIRED EXECUTION:
1. METHODOLOGY: Use the STAR/CAR (Action-Impact-Result) framework.
2. VERBS: Start every point with an Elite Action Verb (e.g., 'Spearheaded', 'Orchestrated', 'Optimized').
3. QUANTIFICATION: Every point must aim to include a metric, percentage, or specific data yield.
4. ATS COMPATIBILITY: Deeply embed technical keywords from the alignment vectors.
5. CONCISENESS: Limit each point to 1-2 lines of high-density impact.
${toneGuidance}

CRITICAL CONSTRAINTS:
- Use PLAIN TEXT ONLY. NO markdown bold (**), italics (*), or bullet symbols inside JSON strings.
- Use only standard hyphens (-) for list items if necessary, but preferred as an array of strings.
- Return ONLY the enhanced content in this exact JSON format.

{
  "responsibilities": ["Enhanced responsibility impact statement 1", "item 2"],
  "achievements": ["Quantified, high-impact achievement 1", "item 2"]
}`;

      let enhancedData: any | null = null;

      try {
        enhancedData = await enterpriseAIService.generateJson<any>(prompt, 'work-experience-enhancement');
      } catch (error) {
        console.warn('Work experience JSON response invalid, retrying with text parsing...', error);
      }

      if (!enhancedData) {
        const responseText = await enterpriseAIService.generateText(prompt, 'work-experience-enhancement');
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          enhancedData = JSON.parse(jsonMatch[0]);
        }
      }

      if (!enhancedData) {
        return {
          content: experience,
          improvements: [`Work experience enhancement skipped for ${experience.jobTitle || 'this role'}`],
          keywords: []
        };
      }

      // Clean markdown formatting from all text arrays
      const cleanedResponsibilities = (enhancedData.responsibilities || experience.responsibilities || [])
        .map((item: string) => this.cleanMarkdownFormatting(item));
      const cleanedAchievements = (enhancedData.achievements || experience.achievements || [])
        .map((item: string) => this.cleanMarkdownFormatting(item));
      
      const enhancedExperience = {
        ...experience,
        responsibilities: cleanedResponsibilities,
        achievements: cleanedAchievements,
      };

      const improvements = this.identifyWorkExperienceImprovements(experience, enhancedExperience);
      const keywords = this.extractKeywords(JSON.stringify(enhancedData), options);

      return {
        content: enhancedExperience,
        improvements,
        keywords,
      };

    } catch (error) {
      console.error('Failed to enhance single work experience:', error);
      throw error;
    }
  }

  /**
   * Enhance project descriptions
   */
  private async enhanceProjects(
    projects: any[],
    options: EnhancementOptions
  ): Promise<{ content: any[]; improvements: string[]; keywords: string[] }> {
    if (!projects.length) {
      return { content: projects, improvements: [], keywords: [] };
    }

    try {
      const enhancedProjects = [];
      const allImprovements: string[] = [];
      const allKeywords: string[] = [];

      for (const project of projects) {
        const enhanced = await this.enhanceSingleProject(project, options);
        enhancedProjects.push(enhanced.content);
        allImprovements.push(...enhanced.improvements);
        allKeywords.push(...enhanced.keywords);
      }

      return {
        content: enhancedProjects,
        improvements: allImprovements,
        keywords: allKeywords,
      };

    } catch (error) {
      console.error('Failed to enhance projects:', error);
      throw error;
    }
  }

  /**
   * Enhance education entries (coursework optimization only)
   */
  private async enhanceEducation(
    education: any[],
    options: EnhancementOptions
  ): Promise<{ content: any[]; improvements: string[]; keywords: string[] }> {
    if (!education.length) {
      return { content: education, improvements: [], keywords: [] };
    }

    const normalizedEducation = education.map((edu) => ({
      institution: edu.institution,
      degree: edu.degree,
      fieldOfStudy: edu.fieldOfStudy,
      coursework: Array.isArray(edu.coursework) ? edu.coursework : []
    }));

    const toneGuidance = this.getToneGuidance(options);
    const prompt = `
You are an academic resume specialist. Improve coursework entries for clarity and ATS alignment without changing factual education data.

CURRENT EDUCATION:
${JSON.stringify(normalizedEducation, null, 2)}

CONTEXT:
${options.jobDescription ? `- Job Description: ${options.jobDescription.substring(0, 300)}` : ''}
${options.keywords ? `- Target Keywords: ${options.keywords.join(', ')}` : ''}

REQUIREMENTS:
1. Only update the "coursework" arrays for each entry.
2. Keep other fields unchanged.
3. Do NOT invent degrees, institutions, or dates.
4. Return ONLY a JSON array of objects in this format:
[
  { "coursework": ["Course 1", "Course 2"] }
]
${toneGuidance}
`;

    let parsed: any[] | null = null;
    try {
      const jsonResponse = await enterpriseAIService.generateJson<any>(prompt, 'education-enhancement');
      if (Array.isArray(jsonResponse)) {
        parsed = jsonResponse;
      } else if (jsonResponse?.education && Array.isArray(jsonResponse.education)) {
        parsed = jsonResponse.education;
      }
    } catch (error) {
      console.warn('Education JSON response invalid, retrying with strict prompt...', error);
    }

    if (!parsed) {
      try {
        const strictPrompt = `${prompt}\n\nCRITICAL: Return ONLY a JSON array. No prose, no code fences.`;
        const retryResponse = await enterpriseAIService.generateText(strictPrompt, 'education-enhancement');
        parsed = this.parseJsonArray(retryResponse);
      } catch (error) {
        console.warn('Education enhancement retry failed, using original education:', error);
      }
    }

    const cleaned = education.map((edu, index) => {
      const entry = parsed?.[index];
      const coursework = Array.isArray(entry?.coursework)
        ? entry.coursework.map((item: string) => this.cleanMarkdownFormatting(item)).filter((item: string) => item)
        : (Array.isArray(edu.coursework) ? edu.coursework : []);
      return {
        ...edu,
        coursework
      };
    });

    const improvements = this.identifyEducationImprovements(education, cleaned);
    const keywords = this.extractKeywords(JSON.stringify(cleaned), options);

    return {
      content: cleaned,
      improvements,
      keywords
    };
  }

  /**
   * Enhance certifications (title/issuer normalization only)
   */
  private async enhanceCertifications(
    certifications: any[],
    options: EnhancementOptions
  ): Promise<{ content: any[]; improvements: string[]; keywords: string[] }> {
    if (!certifications.length) {
      return { content: certifications, improvements: [], keywords: [] };
    }

    const normalizedCerts = certifications.map((cert) => ({
      name: cert.name,
      issuer: cert.issuer
    }));

    const toneGuidance = this.getToneGuidance(options);
    const prompt = `
You are a credential formatting specialist. Normalize certification names and issuers for consistency.

CURRENT CERTIFICATIONS:
${JSON.stringify(normalizedCerts, null, 2)}

REQUIREMENTS:
1. Only adjust "name" and "issuer" casing/spacing if needed.
2. Do NOT invent certifications or change facts.
3. Return ONLY a JSON array of objects:
[
  { "name": "Certification Name", "issuer": "Issuer" }
]
${toneGuidance}
`;

    let parsed: any[] | null = null;
    try {
      const jsonResponse = await enterpriseAIService.generateJson<any>(prompt, 'certifications-enhancement');
      if (Array.isArray(jsonResponse)) {
        parsed = jsonResponse;
      } else if (jsonResponse?.certifications && Array.isArray(jsonResponse.certifications)) {
        parsed = jsonResponse.certifications;
      }
    } catch (error) {
      console.warn('Certifications JSON response invalid, retrying with strict prompt...', error);
    }

    if (!parsed) {
      try {
        const strictPrompt = `${prompt}\n\nCRITICAL: Return ONLY a JSON array. No prose, no code fences.`;
        const retryResponse = await enterpriseAIService.generateText(strictPrompt, 'certifications-enhancement');
        parsed = this.parseJsonArray(retryResponse);
      } catch (error) {
        console.warn('Certifications enhancement retry failed, using original certifications:', error);
      }
    }

    const cleaned = certifications.map((cert, index) => {
      const entry = parsed?.[index] || {};
      return {
        ...cert,
        name: this.cleanMarkdownFormatting(String(entry.name || cert.name || '').trim()),
        issuer: this.cleanMarkdownFormatting(String(entry.issuer || cert.issuer || '').trim())
      };
    });

    const improvements = this.identifyCertificationsImprovements(certifications, cleaned);
    const keywords = this.extractKeywords(JSON.stringify(cleaned), options);

    return {
      content: cleaned,
      improvements,
      keywords
    };
  }

  /**
   * Enhance languages (name normalization only)
   */
  private async enhanceLanguages(
    languages: any[],
    options: EnhancementOptions
  ): Promise<{ content: any[]; improvements: string[]; keywords: string[] }> {
    if (!languages.length) {
      return { content: languages, improvements: [], keywords: [] };
    }

    const normalizedLanguages = languages.map((lang) => ({
      name: lang.name,
      proficiency: lang.proficiency
    }));

    const toneGuidance = this.getToneGuidance(options);
    const prompt = `
You are a resume editor. Normalize language names for consistency.

CURRENT LANGUAGES:
${JSON.stringify(normalizedLanguages, null, 2)}

REQUIREMENTS:
1. Only adjust "name" casing/spacing if needed.
2. Do NOT change proficiency values.
3. Return ONLY a JSON array:
[
  { "name": "Language", "proficiency": "native" }
]
${toneGuidance}
`;

    let parsed: any[] | null = null;
    try {
      const jsonResponse = await enterpriseAIService.generateJson<any>(prompt, 'languages-enhancement');
      if (Array.isArray(jsonResponse)) {
        parsed = jsonResponse;
      } else if (jsonResponse?.languages && Array.isArray(jsonResponse.languages)) {
        parsed = jsonResponse.languages;
      }
    } catch (error) {
      console.warn('Languages JSON response invalid, retrying with strict prompt...', error);
    }

    if (!parsed) {
      try {
        const strictPrompt = `${prompt}\n\nCRITICAL: Return ONLY a JSON array. No prose, no code fences.`;
        const retryResponse = await enterpriseAIService.generateText(strictPrompt, 'languages-enhancement');
        parsed = this.parseJsonArray(retryResponse);
      } catch (error) {
        console.warn('Languages enhancement retry failed, using original languages:', error);
      }
    }

    const cleaned = languages.map((lang, index) => {
      const entry = parsed?.[index] || {};
      return {
        ...lang,
        name: this.cleanMarkdownFormatting(String(entry.name || lang.name || '').trim()),
        proficiency: entry.proficiency || lang.proficiency
      };
    });

    const improvements = this.identifyLanguagesImprovements(languages, cleaned);
    const keywords = this.extractKeywords(JSON.stringify(cleaned), options);

    return {
      content: cleaned,
      improvements,
      keywords
    };
  }

  /**
   * Enhance volunteer experience descriptions and achievements
   */
  private async enhanceVolunteerExperience(
    volunteerExperience: any[],
    options: EnhancementOptions
  ): Promise<{ content: any[]; improvements: string[]; keywords: string[] }> {
    if (!volunteerExperience.length) {
      return { content: volunteerExperience, improvements: [], keywords: [] };
    }

    const normalized = volunteerExperience.map((exp) => ({
      organization: exp.organization,
      role: exp.role,
      description: exp.description,
      achievements: exp.achievements || []
    }));

    const toneGuidance = this.getToneGuidance(options);
    const prompt = `
You are a nonprofit impact writer. Improve volunteer descriptions and achievements without changing factual details.

CURRENT VOLUNTEER EXPERIENCE:
${JSON.stringify(normalized, null, 2)}

CONTEXT:
${options.jobDescription ? `- Job Description: ${options.jobDescription.substring(0, 300)}` : ''}
${options.keywords ? `- Target Keywords: ${options.keywords.join(', ')}` : ''}

REQUIREMENTS:
1. Return ONLY a JSON array with "description" and "achievements" for each entry.
2. Do NOT invent organizations, roles, or dates.
3. Keep tone professional and concise.
[
  { "description": "Improved description", "achievements": ["Achievement 1"] }
]
${toneGuidance}
`;

    let parsed: any[] | null = null;
    try {
      const jsonResponse = await enterpriseAIService.generateJson<any>(prompt, 'volunteer-enhancement');
      if (Array.isArray(jsonResponse)) {
        parsed = jsonResponse;
      } else if (jsonResponse?.volunteerExperience && Array.isArray(jsonResponse.volunteerExperience)) {
        parsed = jsonResponse.volunteerExperience;
      }
    } catch (error) {
      console.warn('Volunteer JSON response invalid, retrying with strict prompt...', error);
    }

    if (!parsed) {
      try {
        const strictPrompt = `${prompt}\n\nCRITICAL: Return ONLY a JSON array. No prose, no code fences.`;
        const retryResponse = await enterpriseAIService.generateText(strictPrompt, 'volunteer-enhancement');
        parsed = this.parseJsonArray(retryResponse);
      } catch (error) {
        console.warn('Volunteer enhancement retry failed, using original volunteer data:', error);
      }
    }

    const cleaned = volunteerExperience.map((exp, index) => {
      const entry = parsed?.[index] || {};
      return {
        ...exp,
        description: entry.description ? this.cleanMarkdownFormatting(entry.description) : exp.description,
        achievements: Array.isArray(entry.achievements)
          ? entry.achievements.map((item: string) => this.cleanMarkdownFormatting(item)).filter((item: string) => item)
          : (exp.achievements || [])
      };
    });

    const improvements = this.identifyVolunteerExperienceImprovements(volunteerExperience, cleaned);
    const keywords = this.extractKeywords(JSON.stringify(cleaned), options);

    return {
      content: cleaned,
      improvements,
      keywords
    };
  }

  /**
   * Enhance awards descriptions
   */
  private async enhanceAwards(
    awards: any[],
    options: EnhancementOptions
  ): Promise<{ content: any[]; improvements: string[]; keywords: string[] }> {
    if (!awards.length) {
      return { content: awards, improvements: [], keywords: [] };
    }

    const normalized = awards.map((award) => ({
      title: award.title,
      issuer: award.issuer,
      description: award.description || ''
    }));

    const toneGuidance = this.getToneGuidance(options);
    const prompt = `
You are an awards editor. Improve award descriptions for clarity and impact.

CURRENT AWARDS:
${JSON.stringify(normalized, null, 2)}

REQUIREMENTS:
1. Return ONLY a JSON array with "description" fields.
2. Do NOT change titles or issuers.
[
  { "description": "Improved description" }
]
${toneGuidance}
`;

    let parsed: any[] | null = null;
    try {
      const jsonResponse = await enterpriseAIService.generateJson<any>(prompt, 'awards-enhancement');
      if (Array.isArray(jsonResponse)) {
        parsed = jsonResponse;
      } else if (jsonResponse?.awards && Array.isArray(jsonResponse.awards)) {
        parsed = jsonResponse.awards;
      }
    } catch (error) {
      console.warn('Awards JSON response invalid, retrying with strict prompt...', error);
    }

    if (!parsed) {
      try {
        const strictPrompt = `${prompt}\n\nCRITICAL: Return ONLY a JSON array. No prose, no code fences.`;
        const retryResponse = await enterpriseAIService.generateText(strictPrompt, 'awards-enhancement');
        parsed = this.parseJsonArray(retryResponse);
      } catch (error) {
        console.warn('Awards enhancement retry failed, using original awards:', error);
      }
    }

    const cleaned = awards.map((award, index) => {
      const entry = parsed?.[index] || {};
      return {
        ...award,
        description: entry.description ? this.cleanMarkdownFormatting(entry.description) : award.description
      };
    });

    const improvements = this.identifyAwardsImprovements(awards, cleaned);
    const keywords = this.extractKeywords(JSON.stringify(cleaned), options);

    return {
      content: cleaned,
      improvements,
      keywords
    };
  }

  /**
   * Enhance publications descriptions
   */
  private async enhancePublications(
    publications: any[],
    options: EnhancementOptions
  ): Promise<{ content: any[]; improvements: string[]; keywords: string[] }> {
    if (!publications.length) {
      return { content: publications, improvements: [], keywords: [] };
    }

    const normalized = publications.map((pub) => ({
      title: pub.title,
      publisher: pub.publisher,
      description: pub.description || ''
    }));

    const toneGuidance = this.getToneGuidance(options);
    const prompt = `
You are a publications editor. Improve publication descriptions for clarity and relevance.

CURRENT PUBLICATIONS:
${JSON.stringify(normalized, null, 2)}

REQUIREMENTS:
1. Return ONLY a JSON array with "description" fields.
2. Do NOT change titles or publishers.
[
  { "description": "Improved description" }
]
${toneGuidance}
`;

    let parsed: any[] | null = null;
    try {
      const jsonResponse = await enterpriseAIService.generateJson<any>(prompt, 'publications-enhancement');
      if (Array.isArray(jsonResponse)) {
        parsed = jsonResponse;
      } else if (jsonResponse?.publications && Array.isArray(jsonResponse.publications)) {
        parsed = jsonResponse.publications;
      }
    } catch (error) {
      console.warn('Publications JSON response invalid, retrying with strict prompt...', error);
    }

    if (!parsed) {
      try {
        const strictPrompt = `${prompt}\n\nCRITICAL: Return ONLY a JSON array. No prose, no code fences.`;
        const retryResponse = await enterpriseAIService.generateText(strictPrompt, 'publications-enhancement');
        parsed = this.parseJsonArray(retryResponse);
      } catch (error) {
        console.warn('Publications enhancement retry failed, using original publications:', error);
      }
    }

    const cleaned = publications.map((pub, index) => {
      const entry = parsed?.[index] || {};
      return {
        ...pub,
        description: entry.description ? this.cleanMarkdownFormatting(entry.description) : pub.description
      };
    });

    const improvements = this.identifyPublicationsImprovements(publications, cleaned);
    const keywords = this.extractKeywords(JSON.stringify(cleaned), options);

    return {
      content: cleaned,
      improvements,
      keywords
    };
  }

  /**
   * Enhance references (normalize formatting only)
   */
  private async enhanceReferences(
    references: any[],
    options: EnhancementOptions
  ): Promise<{ content: any[]; improvements: string[]; keywords: string[] }> {
    if (!references.length) {
      return { content: references, improvements: [], keywords: [] };
    }

    const cleaned = references.map((ref) => ({
      ...ref,
      name: this.cleanMarkdownFormatting(String(ref.name || '').trim()),
      title: this.cleanMarkdownFormatting(String(ref.title || '').trim()),
      company: this.cleanMarkdownFormatting(String(ref.company || '').trim()),
      relationship: this.cleanMarkdownFormatting(String(ref.relationship || '').trim())
    }));

    const improvements = this.identifyReferencesImprovements(references, cleaned);
    const keywords = this.extractKeywords(JSON.stringify(cleaned), options);

    return {
      content: cleaned,
      improvements,
      keywords
    };
  }

  /**
   * Enhance hobbies descriptions
   */
  private async enhanceHobbies(
    hobbies: any[],
    options: EnhancementOptions
  ): Promise<{ content: any[]; improvements: string[]; keywords: string[] }> {
    if (!hobbies.length) {
      return { content: hobbies, improvements: [], keywords: [] };
    }

    const normalized = hobbies.map((hobby) => ({
      name: hobby.name,
      description: hobby.description || ''
    }));

    const toneGuidance = this.getToneGuidance(options);
    const prompt = `
You are a resume editor. Improve hobby descriptions for professionalism and relevance.

CURRENT HOBBIES:
${JSON.stringify(normalized, null, 2)}

REQUIREMENTS:
1. Return ONLY a JSON array with "description" fields.
2. Do NOT change hobby names.
[
  { "description": "Improved description" }
]
${toneGuidance}
`;

    let parsed: any[] | null = null;
    try {
      const jsonResponse = await enterpriseAIService.generateJson<any>(prompt, 'hobbies-enhancement');
      if (Array.isArray(jsonResponse)) {
        parsed = jsonResponse;
      } else if (jsonResponse?.hobbies && Array.isArray(jsonResponse.hobbies)) {
        parsed = jsonResponse.hobbies;
      }
    } catch (error) {
      console.warn('Hobbies JSON response invalid, retrying with strict prompt...', error);
    }

    if (!parsed) {
      try {
        const strictPrompt = `${prompt}\n\nCRITICAL: Return ONLY a JSON array. No prose, no code fences.`;
        const retryResponse = await enterpriseAIService.generateText(strictPrompt, 'hobbies-enhancement');
        parsed = this.parseJsonArray(retryResponse);
      } catch (error) {
        console.warn('Hobbies enhancement retry failed, using original hobbies:', error);
      }
    }

    const cleaned = hobbies.map((hobby, index) => {
      const entry = parsed?.[index] || {};
      return {
        ...hobby,
        description: entry.description ? this.cleanMarkdownFormatting(entry.description) : hobby.description
      };
    });

    const improvements = this.identifyHobbiesImprovements(hobbies, cleaned);
    const keywords = this.extractKeywords(JSON.stringify(cleaned), options);

    return {
      content: cleaned,
      improvements,
      keywords
    };
  }

  /**
   * Enhance additional sections content
   */
  private async enhanceAdditionalSections(
    additionalSections: any[],
    options: EnhancementOptions
  ): Promise<{ content: any[]; improvements: string[]; keywords: string[] }> {
    if (!additionalSections.length) {
      return { content: additionalSections, improvements: [], keywords: [] };
    }

    const normalized = additionalSections.map((section) => ({
      title: section.title,
      content: section.content
    }));

    const toneGuidance = this.getToneGuidance(options);
    const prompt = `
You are a resume editor. Improve additional section content for clarity and impact.

CURRENT SECTIONS:
${JSON.stringify(normalized, null, 2)}

REQUIREMENTS:
1. Return ONLY a JSON array with "content" fields.
2. Do NOT change titles.
[
  { "content": "Improved content" }
]
${toneGuidance}
`;

    let parsed: any[] | null = null;
    try {
      const jsonResponse = await enterpriseAIService.generateJson<any>(prompt, 'additional-sections-enhancement');
      if (Array.isArray(jsonResponse)) {
        parsed = jsonResponse;
      } else if (jsonResponse?.additionalSections && Array.isArray(jsonResponse.additionalSections)) {
        parsed = jsonResponse.additionalSections;
      }
    } catch (error) {
      console.warn('Additional sections JSON response invalid, retrying with strict prompt...', error);
    }

    if (!parsed) {
      try {
        const strictPrompt = `${prompt}\n\nCRITICAL: Return ONLY a JSON array. No prose, no code fences.`;
        const retryResponse = await enterpriseAIService.generateText(strictPrompt, 'additional-sections-enhancement');
        parsed = this.parseJsonArray(retryResponse);
      } catch (error) {
        console.warn('Additional sections enhancement retry failed, using original sections:', error);
      }
    }

    const cleaned = additionalSections.map((section, index) => {
      const entry = parsed?.[index] || {};
      return {
        ...section,
        content: entry.content ? this.cleanMarkdownFormatting(entry.content) : section.content
      };
    });

    const improvements = this.identifyAdditionalSectionsImprovements(additionalSections, cleaned);
    const keywords = this.extractKeywords(JSON.stringify(cleaned), options);

    return {
      content: cleaned,
      improvements,
      keywords
    };
  }

  /**
   * Enhance skills list for relevance and categorization
   */
  private async enhanceSkills(
    skills: any[],
    options: EnhancementOptions
  ): Promise<{ content: any[]; improvements: string[]; keywords: string[] }> {
    if (!skills.length) {
      return { content: skills, improvements: [], keywords: [] };
    }

    const normalizedSkills = skills.map((skill) =>
      typeof skill === 'string'
        ? { name: skill, category: 'technical' }
        : { name: skill.name, category: skill.category || 'technical' }
    );

    const toneGuidance = this.getToneGuidance(options);
    const prompt = `
You are a senior talent strategist. Improve this skills list for relevance and ATS compatibility.

CURRENT SKILLS:
${JSON.stringify(normalizedSkills, null, 2)}

CONTEXT:
${options.jobDescription ? `- Job Description: ${options.jobDescription.substring(0, 300)}` : ''}
${options.keywords ? `- Target Keywords: ${options.keywords.join(', ')}` : ''}

REQUIREMENTS:
1. Keep existing skills unless clearly redundant.
2. Add missing, relevant skills only if supported by the context.
3. Ensure categories are one of: "technical", "soft", "language", "certification".
4. Return ONLY valid JSON array of skill objects in this format:
[
  { "name": "Skill Name", "category": "technical" }
]
${toneGuidance}
`;

    let parsed: any[] | null = null;
    try {
      const jsonResponse = await enterpriseAIService.generateJson<any>(prompt, 'skills-enhancement');
      if (Array.isArray(jsonResponse)) {
        parsed = jsonResponse;
      } else if (jsonResponse?.skills && Array.isArray(jsonResponse.skills)) {
        parsed = jsonResponse.skills;
      }
    } catch (error) {
      console.warn('Skills enhancement JSON response invalid, retrying with strict prompt...', error);
    }

    if (!parsed) {
      try {
        const strictPrompt = `${prompt}\n\nCRITICAL: Return ONLY a JSON array. No prose, no code fences, no trailing commas.`;
        const retryResponse = await enterpriseAIService.generateText(strictPrompt, 'skills-enhancement');
        parsed = this.parseJsonArray(retryResponse);
      } catch (error) {
        console.warn('Skills enhancement retry failed, using original skills:', error);
      }
    }

    const cleaned = (parsed || []).map((item: any) => ({
      name: this.cleanMarkdownFormatting(String(item?.name || '').trim()),
      category: (item?.category || 'technical')
    })).filter((item: any) => item.name);

    if (cleaned.length === 0) {
      return {
        content: normalizedSkills,
        improvements: ['Skills enhancement skipped due to invalid AI response formatting'],
        keywords: []
      };
    }

    const improvements = this.identifySkillsImprovements(skills, cleaned);
    const keywords = this.extractKeywords(JSON.stringify(cleaned), options);

    return {
      content: cleaned,
      improvements,
      keywords,
    };
  }

  /**
   * Enhance a single project
   */
  private async enhanceSingleProject(
    project: any,
    options: EnhancementOptions
  ): Promise<{ content: any; improvements: string[]; keywords: string[] }> {
    try {
      const toneGuidance = this.getToneGuidance(options);
      const prompt = `
You are a Senior Technical Portfolio Architect. Enhance this project description to be a 'Technical Mastery Showcase' that highlights high-caliber engineering and problem-solving impact.

PROJECT: ${project.name}
CURRENT INPUT: ${Array.isArray(project.description) ? project.description.join('. ') : project.description || ''}
TECHNICAL STACK: ${project.technologies?.join(', ') || 'Not specified'}

ALIGNMENT VECTORS:
${options.jobDescription ? `- Role Strategic Blueprint: ${options.jobDescription.substring(0, 300)}` : ''}
${options.keywords ? `- Required Semantic Nodes: ${options.keywords.join(', ')}` : ''}

REQUIRED EXECUTION:
1. IMPACT: Focus on the 'Why' and the 'Business/Technical Result'.
2. STACK: Seamlessly integrate the provided technologies into the narrative.
3. SENIORITY: Use authoritative, senior-level technical terminology.
4. CONCISENESS: Limit to 2-3 sentences of high-density intelligence.
${toneGuidance}

CRITICAL RULES:
- Use PLAIN TEXT ONLY. NO markdown formatting (**bold**, *italics*, etc).
- Return ONLY the enhanced description string. No headers or explanations.

Enhanced Showcase:`;

      const enhancedDescription = await enterpriseAIService.generateText(prompt, 'project-enhancement');

      // Clean any markdown formatting
      const cleanedDescription = this.cleanMarkdownFormatting(enhancedDescription);

      // Convert enhanced description back to array format if original was array
      const processedDescription = Array.isArray(project.description)
        ? cleanedDescription.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0)
        : cleanedDescription;

      const enhancedProject = {
        ...project,
        description: processedDescription,
      };

      const improvements = [`Enhanced project description for "${project.name}"`];
      const keywords = this.extractKeywords(cleanedDescription, options);

      return {
        content: enhancedProject,
        improvements,
        keywords,
      };

    } catch (error) {
      console.error('Failed to enhance project:', error);
      throw error;
    }
  }

  /**
   * Calculate ATS compatibility score
   */
  private calculateATSScore(resumeData: any, options: EnhancementOptions): number {
    let score = 0;
    let maxScore = 0;

    // Professional summary (20%)
    maxScore += 20;
    if (resumeData.professionalSummary) {
      score += 20;
      if (options.keywords) {
        const summaryLower = resumeData.professionalSummary.toLowerCase();
        const keywordMatches = options.keywords.filter(keyword => 
          summaryLower.includes(keyword.toLowerCase())
        ).length;
        score += Math.min(keywordMatches * 2, 10);
        maxScore += 10;
      }
    }

    // Work experience (30%)
    maxScore += 30;
    if (resumeData.workExperience?.length > 0) {
      score += 30;
      // Check for quantifiable achievements
      const hasNumbers = resumeData.workExperience.some((exp: any) =>
        exp.achievements?.some((ach: string) => /\d+/.test(ach))
      );
      if (hasNumbers) score += 10;
      maxScore += 10;
    }

    // Skills section (20%)
    maxScore += 20;
    if (resumeData.skills?.length > 0) {
      score += 20;
    }

    // Education (10%)
    maxScore += 10;
    if (resumeData.education?.length > 0) {
      score += 10;
    }

    // Additional sections (10%)
    maxScore += 10;
    if (resumeData.projects?.length > 0) score += 5;
    if (resumeData.certifications?.length > 0) score += 5;

    return Math.round((score / maxScore) * 100);
  }

  /**
   * Identify improvements made to content
   */
  private identifyImprovements(original: string, enhanced: string): string[] {
    const improvements: string[] = [];
    
    if (enhanced.length > original.length * 1.1) {
      improvements.push('Added more detailed content');
    }
    if (/\d+[\%\+\-\$]/.test(enhanced) && !/\d+[\%\+\-\$]/.test(original)) {
      improvements.push('Added quantifiable metrics');
    }
    if (enhanced !== original) {
      improvements.push('Enhanced language and impact');
    }
    
    return improvements;
  }

  /**
   * Identify work experience improvements
   */
  private identifyWorkExperienceImprovements(original: any, enhanced: any): string[] {
    const improvements: string[] = [];
    
    if (enhanced.achievements?.length > original.achievements?.length) {
      improvements.push('Added more achievements');
    }
    if (enhanced.responsibilities?.length > original.responsibilities?.length) {
      improvements.push('Enhanced responsibility descriptions');
    }
    
    const enhancedText = JSON.stringify(enhanced);
    const originalText = JSON.stringify(original);
    
    if (/\d+[\%\+\-\$]/.test(enhancedText) && !/\d+[\%\+\-\$]/.test(originalText)) {
      improvements.push('Added quantifiable results');
    }
    
    return improvements;
  }

  private identifySkillsImprovements(original: any[], enhanced: any[]): string[] {
    const improvements: string[] = [];
    const originalNames = new Set((original || []).map((skill: any) => (skill.name || skill).toString().toLowerCase()));
    const enhancedNames = new Set((enhanced || []).map((skill: any) => (skill.name || skill).toString().toLowerCase()));

    if (enhancedNames.size > originalNames.size) {
      improvements.push('Added relevant skills');
    }

    const categoryChanged = (enhanced || []).some((skill: any) => skill.category);
    if (categoryChanged) {
      improvements.push('Improved skill categorization');
    }

    return improvements;
  }

  private identifyEducationImprovements(original: any[], enhanced: any[]): string[] {
    const improvements: string[] = [];
    const changed = (enhanced || []).some((edu, idx) =>
      JSON.stringify(edu.coursework || []) !== JSON.stringify(original?.[idx]?.coursework || [])
    );
    if (changed) {
      improvements.push('Refined coursework for ATS relevance');
    }
    return improvements;
  }

  private identifyCertificationsImprovements(original: any[], enhanced: any[]): string[] {
    const improvements: string[] = [];
    const changed = (enhanced || []).some((cert, idx) =>
      (cert.name || '').trim() !== (original?.[idx]?.name || '').trim() ||
      (cert.issuer || '').trim() !== (original?.[idx]?.issuer || '').trim()
    );
    if (changed) {
      improvements.push('Standardized certification titles and issuers');
    }
    return improvements;
  }

  private identifyLanguagesImprovements(original: any[], enhanced: any[]): string[] {
    const improvements: string[] = [];
    const changed = (enhanced || []).some((lang, idx) =>
      (lang.name || '').trim() !== (original?.[idx]?.name || '').trim()
    );
    if (changed) {
      improvements.push('Standardized language names');
    }
    return improvements;
  }

  private identifyVolunteerExperienceImprovements(original: any[], enhanced: any[]): string[] {
    const improvements: string[] = [];
    const changed = (enhanced || []).some((exp, idx) =>
      (exp.description || '').trim() !== (original?.[idx]?.description || '').trim() ||
      JSON.stringify(exp.achievements || []) !== JSON.stringify(original?.[idx]?.achievements || [])
    );
    if (changed) {
      improvements.push('Enhanced volunteer impact descriptions');
    }
    return improvements;
  }

  private identifyAwardsImprovements(original: any[], enhanced: any[]): string[] {
    const improvements: string[] = [];
    const changed = (enhanced || []).some((award, idx) =>
      (award.description || '').trim() !== (original?.[idx]?.description || '').trim()
    );
    if (changed) {
      improvements.push('Enhanced award descriptions');
    }
    return improvements;
  }

  private identifyPublicationsImprovements(original: any[], enhanced: any[]): string[] {
    const improvements: string[] = [];
    const changed = (enhanced || []).some((pub, idx) =>
      (pub.description || '').trim() !== (original?.[idx]?.description || '').trim()
    );
    if (changed) {
      improvements.push('Enhanced publication descriptions');
    }
    return improvements;
  }

  private identifyReferencesImprovements(original: any[], enhanced: any[]): string[] {
    const improvements: string[] = [];
    const changed = (enhanced || []).some((ref, idx) =>
      (ref.name || '').trim() !== (original?.[idx]?.name || '').trim() ||
      (ref.title || '').trim() !== (original?.[idx]?.title || '').trim() ||
      (ref.company || '').trim() !== (original?.[idx]?.company || '').trim() ||
      (ref.relationship || '').trim() !== (original?.[idx]?.relationship || '').trim()
    );
    if (changed) {
      improvements.push('Normalized references formatting');
    }
    return improvements;
  }

  private identifyHobbiesImprovements(original: any[], enhanced: any[]): string[] {
    const improvements: string[] = [];
    const changed = (enhanced || []).some((hobby, idx) =>
      (hobby.description || '').trim() !== (original?.[idx]?.description || '').trim()
    );
    if (changed) {
      improvements.push('Enhanced hobby descriptions');
    }
    return improvements;
  }

  private identifyAdditionalSectionsImprovements(original: any[], enhanced: any[]): string[] {
    const improvements: string[] = [];
    const changed = (enhanced || []).some((section, idx) =>
      (section.content || '').trim() !== (original?.[idx]?.content || '').trim()
    );
    if (changed) {
      improvements.push('Enhanced additional section content');
    }
    return improvements;
  }

  /**
   * Clean markdown formatting from AI-generated content
   */
  private cleanMarkdownFormatting(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove **bold**
      .replace(/\*(.*?)\*/g, '$1')      // Remove *italic*
      .replace(/^\*\s*/gm, '')          // Remove leading bullet points
      .replace(/^•\s*/gm, '')           // Remove bullet point symbols
      .replace(/`(.*?)`/g, '$1')        // Remove `code` formatting
      .replace(/_{2,}(.*?)_{2,}/g, '$1') // Remove __underline__
      .trim();
  }

  private parseJsonArray(responseText: string): any[] {
    let cleaned = responseText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('Invalid JSON array response');
    }

    const slice = cleaned.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch (error) {
      const repaired = slice
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      return JSON.parse(repaired);
    }
  }

  /**
   * Extract keywords from enhanced content
   */
  private extractKeywords(content: string, options: EnhancementOptions): string[] {
    const keywords: string[] = [];
    
    if (options.keywords) {
      const contentLower = content.toLowerCase();
      options.keywords.forEach(keyword => {
        if (contentLower.includes(keyword.toLowerCase())) {
          keywords.push(keyword);
        }
      });
    }
    
    return keywords;
  }

  private getToneGuidance(options: EnhancementOptions): string {
    const tone = options.tone || 'professional';
    return `TONE: ${tone}, clear, and human. Avoid exaggeration, hype, and perfection claims. Do not invent metrics or achievements; if data is missing, keep statements neutral and grounded.`;
  }

  /**
   * Optimize content for specific job posting
   */
  async optimizeForJob(
    resumeData: ResumeData,
    jobDescription: string,
    targetRole?: string
  ): Promise<ContentEnhancementResult> {
    // Extract keywords from job description
    const extractedKeywords = await this.extractJobKeywords(jobDescription);
    
    const options: EnhancementOptions = {
      jobDescription,
      targetRole,
      keywords: extractedKeywords,
      tone: 'professional',
    };

    return this.enhanceResumeContent(resumeData, options);
  }

  /**
   * Extract relevant keywords from job description
   */
  private async extractJobKeywords(jobDescription: string): Promise<string[]> {
    try {
      const prompt = `
You are a Lead ATS Integration Specialist. Perform a strategic semantic audit of this job posting to extract the top 15 most critical 'Target Success Nodes' (Keywords).

STRATEGIC SOURCE:
${jobDescription.substring(0, 2000)}

REQUIRED EXTRACTION NODES:
- Primary Tech Stack (Languages, Frameworks, Infrastructure)
- Required Methodologies (Agile, SDLC, DevOps)
- Strategic Soft Skills (Stakeholder mgmt, Leadership)
- Industry Regulatory/Standard Compliance

CRITICAL RULES:
- Use PLAIN TEXT ONLY.
- Return ONLY a comma-separated list. No explanations.

Keywords:`;

      const keywordsText = await enterpriseAIService.generateText(prompt, 'keyword-extraction');
      
      return keywordsText
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 2 && k.length < 30)
        .slice(0, 15);

    } catch (error) {
      console.error('Failed to extract job keywords:', error);
      return [];
    }
  }
}

// Export singleton instance
export const aiContentEnhancer = new AIContentEnhancer();
