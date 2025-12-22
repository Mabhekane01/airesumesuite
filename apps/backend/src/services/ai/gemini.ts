import { GoogleGenAI } from '@google/genai';

const API_KEY = process.env.GEMINI_API_KEY;

let genAI: GoogleGenAI | null = null;

if (API_KEY) {
  genAI = new GoogleGenAI({
    apiKey: API_KEY,
  });
} else {
  console.warn('GEMINI_API_KEY not found. AI features will be disabled.');
}

export interface ResumeOptimizationParams {
  resumeData: any;
  jobDescription: string;
  jobTitle: string;
  companyName: string;
}

export interface CoverLetterParams {
  personalInfo: any;
  jobDescription: string;
  jobTitle: string;
  companyName: string;
  tone: 'professional' | 'casual' | 'enthusiastic' | 'conservative';
  resumeData?: any;
  keywordOptimization?: boolean;
  customInstructions?: string;
}

function cleanAndParseJson(rawText: string): any {
  console.log('🔧 Raw AI response (first 300 chars):', rawText.substring(0, 300));
  
  // AGGRESSIVE cleaning - remove ALL possible markdown variations
  let cleanedText = rawText
    // Remove markdown code blocks in all forms
    .replace(/```json\n?/gi, '')     // ```json with optional newline
    .replace(/```javascript\n?/gi, '') // sometimes AI uses ```javascript
    .replace(/```\n?/g, '')          // any remaining ```
    .replace(/`{3,}/g, '')           // three or more backticks
    .replace(/^`+|`+$/g, '')         // backticks at start/end
    
    // Remove ALL common prefixes/suffixes that cause JSON parse failures
    .replace(/^Here's the JSON:?\s*/i, '')
    .replace(/^The JSON response is:?\s*/i, '')
    .replace(/^Response:?\s*/i, '')
    .replace(/\s*That's the analysis\.?$/i, '')
    .replace(/^\[Candidate.*?\]/gi, '') // [Candidate...]
    .replace(/^\[Your Job.*?\]/gi, '') // [Your Job...]
    .replace(/^\[Your Profe.*?\]/gi, '') // [Your Profe...]
    .replace(/^\[Job Title.*?\]/gi, '') // [Job Title...]
    .replace(/^\[Professional.*?\]/gi, '') // [Professional...]
    .replace(/^\[Summary.*?\]/gi, '') // [Summary...]
    .replace(/^\[.*?\]\s*/gi, '') // Any other bracketed prefix
    .replace(/^Based on.*?:\s*/gi, '') // "Based on..."
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove **bold** formatting everywhere
    .replace(/\*(.*?)\*/g, '$1') // Remove *italic* formatting everywhere
    .replace(/^\*\*.*?\*\*\s*/gi, '') // Legacy: **Bold text**
    .replace(/^\d+\.\s*/gm, '') // Numbered list items
    .replace(/^[-•]\s*/gm, '') // Bullet points
    
    // Clean whitespace
    .trim();
  
  // COMPREHENSIVE JSON extraction - multiple strategies
  let jsonMatch;
  
  // Strategy 1: Complete JSON object with nested support
  jsonMatch = cleanedText.match(/\{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*\}/);
  
  // Strategy 2: JSON array
  if (!jsonMatch) {
    jsonMatch = cleanedText.match(/\[(?:[^\[\]]|\[(?:[^\[\]]|\[[^\[\]]*\])*\])*\]/);
  }
  
  // Strategy 3: Find content between first/last braces
  if (!jsonMatch) {
    const firstBrace = cleanedText.indexOf('{');
    const lastBrace = cleanedText.lastIndexOf('}');
    const firstBracket = cleanedText.indexOf('[');
    const lastBracket = cleanedText.lastIndexOf(']');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const extracted = cleanedText.substring(firstBrace, lastBrace + 1);
      jsonMatch = [extracted];
    } else if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      const extracted = cleanedText.substring(firstBracket, lastBracket + 1);
      jsonMatch = [extracted];
    }
  }
  
  if (jsonMatch) {
    cleanedText = jsonMatch[0];
    console.log('✂️ Extracted JSON object (first 200 chars):', cleanedText.substring(0, 200));
  } else {
    console.log('⚠️ No JSON object pattern found, using full cleaned text');
  }
  
  // Final cleanup - fix common JSON syntax issues
  cleanedText = cleanedText
    .trim()
    .replace(/,\s*}/g, '}')  // Remove trailing commas
    .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
    .replace(/"\s*\n\s*"/g, '", "') // Fix broken string concatenation
    .replace(/\n/g, ' ')     // Replace newlines with spaces
    .replace(/\s+/g, ' ');   // Normalize whitespace
  
  console.log('🧹 Final cleaned text (first 200 chars):', cleanedText.substring(0, 200));
  console.log('🧹 Final cleaned text (last 50 chars):', cleanedText.substring(Math.max(0, cleanedText.length - 50)));
  
  try {
    const parsed = JSON.parse(cleanedText);
    console.log('✅ JSON parsed successfully!');
    return parsed;
  } catch (error: any) {
    console.error('❌ FINAL JSON PARSE FAILED:');
    console.error('Raw length:', rawText.length);
    console.error('Cleaned length:', cleanedText.length);
    console.error('First 500 chars of cleaned text:', cleanedText.substring(0, 500));
    console.error('Parse error:', error.message);
    
    // COMPREHENSIVE fallback attempts for all scenarios
    const fallbackAttempts = [
      // Attempt 1: Look for matchScore pattern (job matching)
      /\{[\s\S]*?"matchScore"[\s\S]*?\}/,
      // Attempt 2: Look for array pattern (summaries)
      /\[[\s\S]*?"[\s\S]*?"[\s\S]*?\]/,
      // Attempt 3: Look for any object with key-value pairs
      /\{[^{}]*"[^"]*"[^{}]*:[^{}]*\}/,
      // Attempt 4: Extract quoted strings as array
      /"([^"]{10,200})"/g,
      // Attempt 5: Try to reconstruct from specific patterns
      /"matchScore"\s*:\s*(\d+)/
    ];
    
    for (let i = 0; i < fallbackAttempts.length; i++) {
      const match = rawText.match(fallbackAttempts[i]);
      if (match) {
        console.log(`🚨 Attempting fallback extraction #${i + 1}...`);
        try {
          if (i === 3) { // Special handling for quoted strings (summaries)
            const quotes = rawText.match(/"([^"]{10,200})"/g);
            if (quotes && quotes.length > 0) {
              return quotes.map(q => q.replace(/"/g, '')).slice(0, 3);
            }
          } else if (i === 4) { // Special handling for matchScore pattern
            const score = parseInt(match[1]);
            return {
              matchScore: score,
              matchReasons: ['Basic analysis - JSON parsing failed'],
              improvementSuggestions: ['Improve AI response format'],
              keywordMatches: ['Unable to extract'],
              skillsAlignment: {
                matched: ['Analysis incomplete'],
                missing: ['Analysis incomplete']
              },
              experienceAlignment: 'Unable to analyze due to parsing error',
              overallAssessment: 'Analysis incomplete due to response format issues'
            };
          } else {
            return JSON.parse(match[0]);
          }
        } catch (e) {
          console.log(`💥 Fallback attempt #${i + 1} also failed`);
        }
      }
    }
    
    throw new Error(`🚨 AI job match analysis service failed: ${error.message}. Raw response: ${rawText.substring(0, 100)}...`);
  }
}

export class GeminiService {
  public client = genAI || null;
  private modelCooldowns = new Map<string, number>();
  private readonly QUOTA_COOLDOWN = 5 * 1000;

  private getSmartModel(preferred = "gemini-3-flash-preview"): string {
    const g3pro = "gemini-3-pro-preview";
    const g3flash = "gemini-3-flash-preview";
    const g25pro = "gemini-2.5-pro";
    const g25flash = "gemini-2.5-flash";
    const legacy = "gemini-1.5-flash";

    const chain = preferred === g3pro 
      ? [g3pro, g3flash, g25pro, g25flash, legacy]
      : [g3flash, g25flash, legacy];

    for (const model of chain) {
      if (!this.isModelOnCooldown(model)) return model;
    }
    return preferred;
  }

  private isModelOnCooldown(model: string): boolean {
    const cooldown = this.modelCooldowns.get(model);
    if (!cooldown) return false;
    if (Date.now() > cooldown) {
      this.modelCooldowns.delete(model);
      return false;
    }
    return true;
  }

  private markModelExhausted(model: string): void {
    this.modelCooldowns.set(model, Date.now() + this.QUOTA_COOLDOWN);
  }

  /**
   * Generic method for generating content with Gemini
   */
  async generateContent(options: {
    model?: string;
    contents: string;
    config?: {
      temperature?: number;
      topK?: number;
      topP?: number;
      maxOutputTokens?: number;
      candidateCount?: number;
    };
  }): Promise<{ text: string }> {
    if (!this.client) {
      throw new Error('Gemini API not configured. Please set GEMINI_API_KEY environment variable.');
    }

    const modelToUse = this.getSmartModel(options.model || "gemini-3-flash-preview");

    try {
      const result = await this.client.models.generateContent({
        model: modelToUse,
        contents: options.contents
      });

      const text = result.text;
      
      return { text };
    } catch (error: any) {
      console.error(`Gemini API error using ${modelToUse}:`, error);
      
      if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('503')) {
        this.markModelExhausted(modelToUse);
        if (modelToUse !== "gemini-1.5-flash") {
          return this.generateContent(options);
        }
      }
      
      throw new Error(`Gemini generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async optimizeResume(params: ResumeOptimizationParams): Promise<any> {
    const model = this.getSmartModel("gemini-3-flash-preview");
    const prompt = `
You are an expert resume writer and ATS optimization specialist. Analyze the provided resume data and job description, then optimize the resume to better match the job requirements while maintaining truthfulness.

Job Details:
- Job Title: ${params.jobTitle}
- Company: ${params.companyName}
- Job Description: ${params.jobDescription}

Current Resume Data:
${JSON.stringify(params.resumeData, null, 2)}

Please provide an optimized version of the resume with the following improvements:
1. Enhanced professional summary that aligns with the job requirements
2. Optimized work experience descriptions using the STAR method where possible
3. Keyword optimization for ATS compatibility
4. Skills prioritization based on job requirements
5. Achievement quantification where appropriate

Return the response as a JSON object with the same structure as the input resume data, but with optimized content.

Focus on:
- Using relevant keywords from the job description naturally
- Quantifying achievements with numbers, percentages, or metrics
- Highlighting transferable skills and relevant experience
- Maintaining honesty and accuracy
- Making the resume ATS-friendly

Respond only with the optimized JSON data, no additional text.
`;

    try {
      if (!this.client) throw new Error('Gemini not configured');
      const response = await this.client.models.generateContent({
        model: model,
        contents: prompt,
      });
      const text = response.text;
      const parsed = cleanAndParseJson(text);
      
      if (parsed && typeof parsed === 'object') {
        parsed._resilience = {
          model: model,
          isFallback: model !== "gemini-3-flash-preview"
        };
      }
      
      return parsed;
    } catch (error: any) {
      console.error(`Error optimizing resume with ${model}:`, error);
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        this.markModelExhausted(model);
        if (model !== "gemini-1.5-flash") return this.optimizeResume(params);
      }
      throw new Error('Failed to optimize resume');
    }
  }

  async generateCoverLetter(options: {
    jobDescription: string;
    jobTitle: string;
    companyName: string;
    tone: 'professional' | 'casual' | 'enthusiastic' | 'conservative';
    resumeData?: any;
    customInstructions?: string;
    keywordOptimization?: boolean;
    personalInfo?: {
      firstName: string;
      lastName: string;
      email: string;
      location: string;
    };
  }): Promise<string> {
    if (!this.client) {
      throw new Error('Gemini API not configured. Please set GEMINI_API_KEY environment variable.');
    }
    
    const { 
      jobDescription, 
      jobTitle, 
      companyName, 
      tone, 
      resumeData,
      customInstructions,
      keywordOptimization = true,
      personalInfo
    } = options;
    
    // Extract key information from resume for intelligent matching
    const workExperience = resumeData?.workExperience || [];
    const skills = resumeData?.skills || [];
    const education = resumeData?.education || [];
    const achievements = workExperience.flatMap((exp: any) => exp.achievements || []);
    const applicantName = personalInfo?.firstName ? `${personalInfo.firstName} ${personalInfo.lastName}` : resumeData?.personalInfo?.firstName ? `${resumeData.personalInfo.firstName} ${resumeData.personalInfo.lastName}` : '[Your Name]';
    
    // Analyze job description for key requirements
    const jobKeywords = this.extractJobKeywords(jobDescription);
    const relevantSkills = skills.filter((skill: any) => 
      jobKeywords.some(keyword => 
        skill.name.toLowerCase().includes(keyword.toLowerCase()) ||
        keyword.toLowerCase().includes(skill.name.toLowerCase())
      )
    );
    
    // Get tone-specific language patterns
    const toneGuidelines = this.getToneGuidelines(tone);
    
    const prompt = `
You are an award-winning professional cover letter writer with 15+ years of experience helping candidates secure interviews at top companies. Create an exceptional, highly personalized cover letter that will make this candidate stand out.

🎯 CANDIDATE PROFILE:
Name: ${applicantName}
Professional Title: ${resumeData?.personalInfo?.professionalTitle || 'Professional'}

📋 PROFESSIONAL BACKGROUND:
${resumeData?.professionalSummary ? `Summary: ${resumeData.professionalSummary}` : ''}

Work Experience:
${workExperience.map((exp: any) => `
• ${exp.jobTitle} at ${exp.company} (${exp.startDate} - ${exp.isCurrentJob ? 'Present' : exp.endDate})
  Key Responsibilities: ${exp.responsibilities?.slice(0, 3).join(', ')}
  Achievements: ${exp.achievements?.slice(0, 2).join(', ')}`).join('')}

Key Skills: ${skills.map((s: any) => s.name).slice(0, 10).join(', ')}
Education: ${education.map((edu: any) => `${edu.degree} in ${edu.fieldOfStudy} from ${edu.institution}`).join(', ')}

🏢 TARGET POSITION:
Job Title: ${jobTitle}
Company: ${companyName}

📄 JOB REQUIREMENTS ANALYSIS:
${jobDescription}

${keywordOptimization ? `🔑 IDENTIFIED KEY SKILLS MATCH:
${relevantSkills.map((skill: any) => `• ${skill.name} (${skill.category})`).join('\n')}

📊 QUANTIFIED ACHIEVEMENTS TO HIGHLIGHT:
${achievements.filter((ach: string) => /\d+/.test(ach)).slice(0, 3).join('\n• ')}
` : ''}

🎨 TONE & STYLE REQUIREMENTS:
${toneGuidelines}

${customInstructions ? `✨ CUSTOM INSTRUCTIONS:
${customInstructions}
` : ''}

📝 COVER LETTER REQUIREMENTS:

1.  **FULL STRUCTURE**: Generate a complete cover letter. This includes:
    *   **Your Contact Information**: (Name, Phone, Email - use placeholders if not available in resume data).
    *   **Date**.
    *   **Hiring Manager's Information**: (Title, Company Name, Company Address - use placeholders).
    *   **Salutation**: (e.g., "Dear Hiring Manager,").
    *   **Body Paragraphs**: (Introduction, value proposition, company alignment).
    *   **Closing**: (e.g., "Sincerely,").
    *   **Your Typed Name**.

2. OPENING HOOK (2-3 sentences):
   - Start with a compelling statement that immediately shows value
   - Reference specific company knowledge or recent company news/achievements
   - Clearly state the position and express genuine enthusiasm

3. VALUE PROPOSITION PARAGRAPH (3-4 sentences):
   - Highlight 2-3 most relevant accomplishments with specific metrics
   - Draw direct connections between experience and job requirements
   - Use power words and action verbs
   - Incorporate relevant keywords naturally

4. COMPANY ALIGNMENT PARAGRAPH (2-3 sentences):
   - Show research about the company's mission, values, or recent developments
   - Explain why you're specifically interested in THIS company
   - Connect your career goals with the company's direction

5. CLOSING CALL-TO-ACTION (2 sentences):
   - Express confidence in your ability to contribute
   - Include a specific next step or availability for interview

📐 FORMATTING SPECIFICATIONS:
- Professional business letter format
- 280-380 words total length
- Use active voice throughout
- Include proper salutation ("Dear Hiring Manager" or "Dear [Specific Name]")
- Professional closing ("Sincerely" for professional/conservative, "Best regards" for casual/enthusiastic)
- Signature line with full name

⚡ OPTIMIZATION FEATURES:
- ATS-friendly formatting (no special characters, proper headers)
- Strategic keyword placement (${keywordOptimization ? 'ENABLED' : 'DISABLED'})
- Industry-specific language and terminology
- Quantified achievements where possible
- Company-specific customization

🚀 MAKE IT EXCEPTIONAL:
- Use storytelling elements to create emotional connection
- Include specific examples that demonstrate problem-solving abilities
- Show personality while maintaining professionalism
- Create urgency and desire to interview the candidate
- End with confidence and forward momentum

Generate the complete cover letter now. Return ONLY the cover letter content with proper business formatting - no explanations, no additional text.
`;

    try {
      const response = await this.client.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      let coverLetter = response.text;
      
      // Post-process for consistency and formatting
      coverLetter = this.postProcessCoverLetter(coverLetter, resumeData?.personalInfo, tone);
      
      return coverLetter;
    } catch (error) {
      console.error('Error generating cover letter with Gemini:', error);
      throw new Error('Failed to generate cover letter');
    }
  }

  async generateProfessionalSummary(resumeData: any): Promise<string> {
    if (!this.client) {
      throw new Error('Gemini API not configured. Please set GEMINI_API_KEY environment variable.');
    }

    const prompt = `
You are an expert resume writer specializing in crafting compelling professional summaries. Analyze the provided resume data and create a professional summary that effectively showcases the candidate's value proposition.

Resume Data:
${JSON.stringify(resumeData, null, 2)}

Create a professional summary that:
1. Highlights key strengths and expertise areas
2. Quantifies achievements when possible
3. Includes relevant industry keywords
4. Shows career progression and growth
5. Demonstrates unique value proposition
6. Is 2-4 sentences long and impactful
7. Uses active voice and strong action words
8. Tailors to the candidate's experience level (entry, mid, senior)

Guidelines:
- For entry-level: Focus on education, internships, projects, and potential
- For mid-level: Emphasize skills, achievements, and career growth
- For senior-level: Highlight leadership, strategy, and major accomplishments
- Use metrics and numbers where available from the provided data
- Avoid generic phrases and clichés
- Make it ATS-friendly with relevant keywords

Return only the professional summary text, no additional formatting or explanations.
`;

    try {
      const response = await this.client.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt + "\n\nReturn as an array with a single professional summary string.",
      });
      const summaries = JSON.parse(response.text.trim());
      return Array.isArray(summaries) ? summaries[0] || '' : '';
    } catch (error) {
      console.error('Error generating professional summary with Gemini:', error);
      throw new Error('Failed to generate professional summary');
    }
  }

  async generateMultipleProfessionalSummaries(resumeData: any): Promise<string[]> {
    if (!this.client) {
      throw new Error('Gemini API not configured. Please set GEMINI_API_KEY environment variable.');
    }

    const prompt = `
You are an expert resume writer specializing in crafting compelling professional summaries. Analyze the provided resume data and create THREE distinct, high-quality professional summary options that showcase different aspects of the candidate's value proposition.

Resume Data:
${JSON.stringify(resumeData, null, 2)}

Create 3 professional summary variations that:
1. Highlight different key strengths and expertise areas
2. Use different approaches (achievement-focused, skills-focused, leadership-focused)
3. Include relevant industry keywords
4. Are 2-4 sentences long and impactful
5. Use active voice and strong action words
6. Tailor to the candidate's experience level

Variation Guidelines:
- Option 1: Achievement and results-focused summary highlighting quantifiable accomplishments
- Option 2: Skills and expertise-focused summary emphasizing technical competencies and domain knowledge
- Option 3: Leadership and impact-focused summary showcasing influence and strategic contributions

Each summary should:
- Be unique and offer a different perspective on the candidate
- Include specific metrics and achievements from the provided data
- Use industry-relevant keywords for ATS optimization
- Avoid generic phrases and clichés
- Be compelling and memorable

You must return a JSON array with exactly 3 professional summaries.

RETURN ONLY THIS FORMAT (no explanations, no markdown, no other text):
["Professional summary 1", "Professional summary 2", "Professional summary 3"]

Generate exactly 3 professional summary variations. Each should be:
- A complete professional summary (2-4 sentences)
- Unique and offer a different perspective on the candidate
- Include specific metrics and achievements from the provided data
- Use industry-relevant keywords for ATS optimization
- Avoid generic phrases and clichés
- Be compelling and memorable
`;

    try {
      const response = await this.client.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      const text = response.text.trim();
      
      const summaries = cleanAndParseJson(text);
      if (!Array.isArray(summaries) || summaries.length !== 3) {
        throw new Error('Invalid response format');
      }
      
      return summaries;
    } catch (error) {
      console.error('Error generating multiple professional summaries with Gemini:', error);
      throw new Error('Failed to generate multiple professional summaries');
    }
  }

  async scoreATSCompatibility(resumeData: any, jobDescription?: string): Promise<{
    score: number;
    recommendations: string[];
    keywordMatch: number;
    formatScore: number;
    contentScore: number;
  }> {
    if (!this.client) {
      throw new Error('Gemini API not configured. Please set GEMINI_API_KEY environment variable.');
    }

    const prompt = `
You are an ATS (Applicant Tracking System) expert. Analyze the provided resume data and give it an ATS compatibility score along with specific recommendations for improvement.

Resume Data:
${JSON.stringify(resumeData, null, 2)}

${jobDescription ? `Job Description for Keyword Analysis:\n${jobDescription}` : ''}

Evaluate the resume based on these ATS criteria:

1. Format Compatibility (0-100):
   - Simple formatting without complex layouts
   - Standard sections and headers
   - No images, charts, or graphics
   - Consistent font usage
   - Proper section ordering

2. Keyword Optimization (0-100):
   - Relevant industry keywords
   - Job-specific skills and technologies
   - Action verbs and power words
   - ${jobDescription ? 'Keywords matching the job description' : 'Industry-standard keywords'}

3. Content Structure (0-100):
   - Clear section headers
   - Quantified achievements
   - Proper date formatting
   - Complete contact information
   - Relevant experience organization

4. Overall ATS Score (0-100):
   - Weighted average of above scores
   - Likelihood of passing ATS filters

Provide specific, actionable recommendations for improvement in each area.

Return the response as a JSON object in this exact format:
{
  "score": number (0-100),
  "recommendations": ["specific recommendation 1", "specific recommendation 2", ...],
  "keywordMatch": number (0-100),
  "formatScore": number (0-100),
  "contentScore": number (0-100)
}

Respond only with the JSON data, no additional text.
`;

    try {
      const response = await this.client.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      const text = response.text;
      
      const atsAnalysis = cleanAndParseJson(text);
      return atsAnalysis;
    } catch (error) {
      console.error('Error analyzing ATS compatibility with Gemini:', error);
      throw new Error('Failed to analyze ATS compatibility');
    }
  }

  async improveResumeWithFeedback(resumeData: any, feedback: string): Promise<any> {
    if (!this.client) {
      throw new Error('Gemini API not configured. Please set GEMINI_API_KEY environment variable.');
    }

    const prompt = `
You are an expert resume coach. Based on the provided feedback, improve the resume data to address the specific concerns and suggestions.

Current Resume Data:
${JSON.stringify(resumeData, null, 2)}

Feedback to Address:
${feedback}

Instructions:
1. Analyze the feedback carefully
2. Make specific improvements to address each point
3. Maintain accuracy and truthfulness
4. Improve weak areas without fabricating information
5. Enhance formatting and presentation
6. Strengthen language and impact statements
7. Better organize information if needed

Return the improved resume data in the same JSON structure as the input, with all necessary enhancements applied.

Respond only with the improved JSON data, no additional text.
`;

    try {
      const response = await this.client.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      const text = response.text;
      
      const improvedResume = cleanAndParseJson(text);
      return improvedResume;
    } catch (error) {
      console.error('Error improving resume with feedback:', error);
      throw new Error('Failed to improve resume with feedback');
    }
  }

  async calculateJobMatchScore(jobDescription: string, resumeContent: string, jobTitle: string, companyName: string): Promise<{
    matchScore: number;
    matchReasons: string[];
    improvementSuggestions: string[];
    keywordMatches: string[];
    skillsAlignment: {
      matched: string[];
      missing: string[];
    };
    experienceAlignment: string;
    overallAssessment: string;
  }> {
    if (!this.client) {
      throw new Error('Gemini API not configured. Please set GEMINI_API_KEY environment variable.');
    }

    // Add multiple unique identifiers to force fresh analysis
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const analysisId = `${timestamp}_${randomId}`;
    const sessionId = `sess_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    
    console.log(`🔍 [${analysisId}] STARTING FRESH GEMINI ANALYSIS`);
    console.log(`   Session ID: ${sessionId}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);
    console.log(`   Job Title: "${jobTitle}"`);
    console.log(`   Company: "${companyName}"`);
    console.log(`   Job Description Length: ${jobDescription.length} chars`);
    console.log(`   Job Description Preview: "${jobDescription.substring(0, 200)}..."`);
    console.log(`   Resume Content Length: ${resumeContent.length} chars`);
    console.log(`   Resume Content Preview: "${resumeContent.substring(0, 200)}..."`);
    
    // Validate inputs
    if (!jobDescription || jobDescription.length < 50) {
      throw new Error('Job description is too short or empty. Need meaningful job description for accurate analysis.');
    }
    
    if (!resumeContent || resumeContent.length < 100) {
      throw new Error('Resume content is too short or empty. Need detailed resume content for accurate analysis.');
    }

    // Additional entropy to prevent caching
    const entropy = {
      analysisVersion: '2.0',
      timestamp: timestamp,
      randomSeed: Math.random(),
      processingId: analysisId,
      sessionId: sessionId,
      hashInput: (jobDescription + resumeContent + jobTitle + companyName).length
    };

    const prompt = `
🔥 CRITICAL: THIS IS A UNIQUE ANALYSIS REQUEST #${analysisId} 🔥

SYSTEM METADATA:
- Analysis ID: ${analysisId}
- Session ID: ${sessionId}
- Timestamp: ${new Date().toISOString()}
- Random Seed: ${entropy.randomSeed}
- Processing ID: ${entropy.processingId}
- Analysis Version: ${entropy.analysisVersion}
- Input Hash Length: ${entropy.hashInput}

⚠️ ANTI-CACHE DIRECTIVE: Each response MUST be calculated fresh. No cached responses allowed.
⚠️ SCORING DIRECTIVE: Scores MUST vary realistically based on actual content compatibility.
⚠️ UNIQUENESS DIRECTIVE: This specific job-resume combination has never been analyzed before.

You are an expert AI recruiter performing a REAL-TIME job matching analysis.

=== JOB POSTING ===
Position: ${jobTitle}
Company: ${companyName}
Full Job Description:
${jobDescription}

=== CANDIDATE PROFILE ===
Complete Resume Content:
${resumeContent}

🎯 ANALYSIS REQUIREMENTS:

1. THOROUGH CONTENT ANALYSIS:
   - Read EVERY word of both documents
   - Extract 10-15 specific job requirements
   - Match against candidate's actual experience
   - Calculate based on real compatibility

2. SCORING METHODOLOGY:
   Technical Skills Match (40%): Exact technology/tool matches
   Experience Level (25%): Years and seniority alignment  
   Domain Experience (20%): Industry/field relevance
   Education/Certifications (10%): Academic requirements
   Soft Skills/Culture (5%): Behavioral indicators

3. REALISTIC SCORE DISTRIBUTION:
   90-95%: Perfect match (rare, only if almost everything aligns)
   75-89%: Excellent match (strong candidate)
   60-74%: Good match (viable candidate with some gaps)
   45-59%: Fair match (needs development)
   30-44%: Poor match (significant misalignment)
   15-29%: Very poor match (wrong field/level)

4. EVIDENCE REQUIREMENTS:
   - Quote specific phrases from BOTH documents
   - Identify exact skill/experience matches
   - Note specific gaps with examples
   - Provide actionable improvement advice

🚨 CRITICAL: Score must be based on ACTUAL analysis, not guesswork or defaults.

🚨 CRITICAL RESPONSE FORMAT REQUIREMENTS:
1. Return ONLY valid JSON - no markdown, no code blocks, no explanations
2. Do NOT wrap response in \`\`\`json or \`\`\` 
3. Start directly with { and end with }
4. No text before or after the JSON

Return ONLY this JSON structure:
{
  "matchScore": [INTEGER_15_TO_95_BASED_ON_REAL_ANALYSIS],
  "matchReasons": [
    "Candidate has [SPECIFIC SKILL/EXPERIENCE] which directly matches job requirement: [EXACT QUOTE FROM JOB DESCRIPTION]",
    "Resume shows [SPECIFIC ACHIEVEMENT/ROLE] aligning with [SPECIFIC JOB NEED]",
    "[THIRD SPECIFIC MATCH WITH EVIDENCE]"
  ],
  "improvementSuggestions": [
    "Job requires [SPECIFIC SKILL] not shown in resume - consider adding relevant projects or training",
    "[SPECIFIC GAP] could be addressed by [ACTIONABLE ADVICE]",
    "[THIRD SPECIFIC IMPROVEMENT SUGGESTION]"
  ],
  "keywordMatches": [
    "[EXACT TERM FOUND IN BOTH DOCUMENTS]",
    "[ANOTHER MATCHING KEYWORD]",
    "[THIRD KEYWORD MATCH]"
  ],
  "skillsAlignment": {
    "matched": ["[SPECIFIC SKILL FROM RESUME MATCHING JOB]", "[ANOTHER MATCHED SKILL]"],
    "missing": ["[REQUIRED SKILL NOT IN RESUME]", "[ANOTHER MISSING SKILL]"]
  },
  "experienceAlignment": "Candidate has [X YEARS] experience in [SPECIFIC DOMAIN] with roles including [SPECIFIC POSITIONS]. Job requires [SPECIFIC EXPERIENCE LEVEL/TYPE]. [DETAILED ALIGNMENT ANALYSIS]",
  "overallAssessment": "Based on analysis of this specific combination: [DETAILED ASSESSMENT OF FIT INCLUDING SPECIFIC EVIDENCE FROM BOTH DOCUMENTS]"
}

RESPOND WITH ONLY PURE JSON - NO MARKDOWN, NO CODE BLOCKS, NO OTHER TEXT.
`;

    try {
      console.log(`🤖 [${analysisId}] Initiating FRESH Gemini analysis...`);
      console.log(`📊 [${analysisId}] Entropy data:`, entropy);
      
      // Add timeout wrapper with retry logic
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI request timeout')), 45000); // Increased to 45s
      });

      // Use generateContent with fresh configuration optimized for JSON
      const aiPromise = this.client.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          temperature: 0.2, // Even more deterministic
          topK: 10,
          topP: 0.5,
          maxOutputTokens: 4096,
          candidateCount: 1,
        },
      });
      
      const response = await Promise.race([aiPromise, timeoutPromise]) as any;
      
      // Enhanced text extraction with multiple fallback strategies
      let text = '';
      if (response.text) {
        text = response.text;
      } else if (response.candidates && Array.isArray(response.candidates) && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.content && candidate.content.parts && Array.isArray(candidate.content.parts) && candidate.content.parts.length > 0) {
          text = candidate.content.parts[0].text || '';
        } else if (candidate.text) {
          text = candidate.text;
        } else if (typeof candidate === 'string') {
          text = candidate;
        }
      } else if (response.content && response.content.parts && Array.isArray(response.content.parts) && response.content.parts.length > 0) {
        text = response.content.parts[0].text || '';
      } else if (response.parts && Array.isArray(response.parts) && response.parts.length > 0) {
        text = response.parts[0].text || '';
      }
      
      if (!text) {
        console.error('❌ Unexpected response structure:', JSON.stringify(response, null, 2));
        throw new Error('Unable to extract text from Gemini response');
      }
      
      console.log(`📝 [${analysisId}] Raw Gemini response (${text.length} chars):`);
      console.log(`   First 300 chars: ${text.substring(0, 300)}...`);
      console.log(`   Last 100 chars: ...${text.substring(text.length - 100)}`);
      
      const matchAnalysis = cleanAndParseJson(text);
      
      // Comprehensive validation
      if (!matchAnalysis || typeof matchAnalysis !== 'object') {
        throw new Error('Invalid response format - not a valid object');
      }
      
      if (!matchAnalysis.matchScore || typeof matchAnalysis.matchScore !== 'number') {
        throw new Error(`Invalid match score: ${matchAnalysis.matchScore} (type: ${typeof matchAnalysis.matchScore})`);
      }
      
      if (matchAnalysis.matchScore < 15 || matchAnalysis.matchScore > 95) {
        throw new Error(`Match score ${matchAnalysis.matchScore} is outside valid range 15-95`);
      }
      
      // Check for suspicious static responses
      const suspiciousScores = [78, 75, 80, 70, 85]; // Common default scores
      if (suspiciousScores.includes(matchAnalysis.matchScore)) {
        console.warn(`⚠️ [${analysisId}] Potentially static score detected: ${matchAnalysis.matchScore}`);
      }
      
      console.log(`✅ [${analysisId}] Analysis validation passed:`, {
        matchScore: matchAnalysis.matchScore,
        matchReasons: matchAnalysis.matchReasons?.length || 0,
        improvementSuggestions: matchAnalysis.improvementSuggestions?.length || 0,
        keywordMatches: matchAnalysis.keywordMatches?.length || 0,
        hasSkillsAlignment: !!matchAnalysis.skillsAlignment,
        hasExperienceAlignment: !!matchAnalysis.experienceAlignment,
        hasOverallAssessment: !!matchAnalysis.overallAssessment
      });
      
      // Add analysis metadata to response
      return {
        ...matchAnalysis,
        _metadata: {
          analysisId,
          sessionId,
          timestamp: new Date().toISOString(),
          entropy
        }
      };
    } catch (error: any) {
      console.error(`❌ [${analysisId}] Critical analysis failure:`, {
        error: error.message,
        stack: error.stack,
        entropy
      });
      
      // Handle timeout errors with retry
      if (error.message === 'AI request timeout') {
        console.log(`🔄 [${analysisId}] Timeout detected, attempting retry with shorter content...`);
        try {
          // Retry with truncated inputs to avoid timeout
          const shorterJobDesc = jobDescription.substring(0, 1000);
          const shorterResume = resumeContent.substring(0, 1500);
          
          const retryPromise = this.client.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt.replace(jobDescription, shorterJobDesc).replace(resumeContent, shorterResume),
            config: {
              temperature: 0.3,
              topK: 10,
              topP: 0.5,
              maxOutputTokens: 2048,
              candidateCount: 1,
            },
          });
          
          const retryTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Retry timeout')), 30000);
          });
          
          const retryResponse = await Promise.race([retryPromise, retryTimeoutPromise]) as any;
          const retryText = retryResponse.text;
          const retryAnalysis = cleanAndParseJson(retryText);
          
          console.log(`✅ [${analysisId}] Retry succeeded with shortened content`);
          return {
            ...retryAnalysis,
            _metadata: {
              analysisId,
              sessionId,
              timestamp: new Date().toISOString(),
              entropy,
              retry: true
            }
          };
        } catch (retryError) {
          console.error(`❌ [${analysisId}] Retry also failed:`, retryError);
          throw new Error(`Failed to calculate job match score after retry [${analysisId}]: ${retryError.message}`);
        }
      }
      
      throw new Error(`Failed to calculate job match score [${analysisId}]: ${error.message}`);
    }
  }

  async extractResumeFromText(resumeText: string): Promise<any> {
    if (!this.client) {
      throw new Error('Gemini API not configured. Please set GEMINI_API_KEY environment variable.');
    }
    const prompt = `
You are an expert at parsing resume data. Extract structured information from the provided resume text and return it as a JSON object.

Resume Text:
${resumeText}

Extract and structure the following information:
1. Personal Information (name, email, phone, location, URLs)
2. Professional Summary/Objective
3. Work Experience (job title, company, location, dates, responsibilities, achievements)
4. Education (institution, degree, field of study, graduation date, GPA if mentioned)
5. Skills (categorized as technical, soft skills, languages, certifications)
6. Projects (if mentioned)
7. Certifications
8. Languages

Return the data in this JSON structure:
{
  "personalInfo": {
    "firstName": "",
    "lastName": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedinUrl": "",
    "portfolioUrl": "",
    "githubUrl": ""
  },
  "professionalSummary": "",
  "workExperience": [
    {
      "jobTitle": "",
      "company": "",
      "location": "",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "isCurrentJob": false,
      "responsibilities": [],
      "achievements": []
    }
  ],
  "education": [
    {
      "institution": "",
      "degree": "",
      "fieldOfStudy": "",
      "graduationDate": "YYYY-MM-DD",
      "gpa": "",
      "honors": []
    }
  ],
  "skills": [
    {
      "name": "",
      "category": "technical|soft|language|certification",
      "proficiencyLevel": "beginner|intermediate|advanced|expert"
    }
  ],
  "projects": [
    {
      "name": "",
      "description": "",
      "technologies": [],
      "url": ""
    }
  ],
  "certifications": [],
  "languages": []
}

If information is not available, use empty strings or arrays. For dates, use ISO format (YYYY-MM-DD) or estimate based on context.

Respond only with the JSON data, no additional text.
`;

    try {
      const response = await this.client.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      const text = response.text;
      
      // Parse the JSON response
      const extractedData = cleanAndParseJson(text);
      return extractedData;
    } catch (error) {
      console.error('Error extracting resume data with Gemini:', error);
      throw new Error('Failed to extract resume data');
    }
  }
  
  private extractJobKeywords(jobDescription: string): string[] {
    // Extract meaningful keywords from job description
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'we', 'you', 'our', 'your', 'will', 'be', 'is', 'are', 'have', 'has', 'this', 'that',
      'work', 'job', 'role', 'position', 'company', 'team', 'experience', 'skills'
    ]);
    
    const words = jobDescription
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word));
    
    // Get word frequency and return top keywords
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });
    
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word]) => word);
  }
  
  private getToneGuidelines(tone: string): string {
    const guidelines = {
      professional: `
• Use formal language and industry terminology
• Maintain respectful, polished tone throughout
• Focus on achievements and qualifications
• Use phrases like "I am pleased to submit", "demonstrated expertise", "proven track record"
• Avoid contractions and casual expressions`,
      casual: `
• Use conversational but respectful language
• Show personality while remaining appropriate
• Use contractions naturally (I'm, I'd, you're)
• Include phrases like "I'm excited about", "I'd love to", "this opportunity really appeals to me"
• Balance friendliness with professionalism`,
      enthusiastic: `
• Express genuine excitement and passion
• Use energetic, positive language
• Show eagerness to contribute and learn
• Include phrases like "I'm thrilled to apply", "incredibly excited", "passionate about"
• Demonstrate motivation and drive`,
      conservative: `
• Use traditional, formal business language
• Emphasize stability, reliability, and professionalism
• Focus on long-term value and commitment
• Use phrases like "I respectfully submit", "I would be honored", "steadfast commitment"
• Avoid casual expressions or overly enthusiastic language`
    };
    
    return guidelines[tone as keyof typeof guidelines] || guidelines.professional;
  }
  
  private postProcessCoverLetter(coverLetter: string, personalInfo: any, tone: string): string {
    // Ensure proper formatting and consistency
    let processed = coverLetter.trim();
    
    // Add date if missing
    if (!processed.includes(new Date().getFullYear().toString())) {
      const today = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      processed = `${today}\n\n${processed}`;
    }
    
    // Ensure proper signature
    const firstName = personalInfo.firstName || 'Your';
    const lastName = personalInfo.lastName || 'Name';
    const fullName = `${firstName} ${lastName}`;
    
    if (!processed.includes(fullName)) {
      const closings = {
        professional: 'Sincerely,',
        conservative: 'Respectfully,',
        casual: 'Best regards,',
        enthusiastic: 'With enthusiasm,'
      };
      
      const closing = closings[tone as keyof typeof closings] || 'Sincerely,';
      processed += `\n\n${closing}\n${fullName}`;
    }
    
    // Clean up formatting
    processed = processed
      .replace(/\n{3,}/g, '\n\n')  // Remove excessive line breaks
      .replace(/^\s+|\s+$/gm, '') // Trim lines
      .replace(/\s{2,}/g, ' ')    // Remove excessive spaces
      .trim();
    
    return processed;
  }

  /**
   * Dedicated method for LaTeX generation with enhanced validation
   */
  async generateLatex(prompt: string): Promise<string> {
    if (!this.client) {
      throw new Error('Gemini API not configured. Please set GEMINI_API_KEY environment variable.');
    }
    
    try {
      console.log('🎯 Using LaTeX-optimized generation settings...');
      console.log('📝 PROMPT LENGTH:', prompt.length);
      console.log('📝 PROMPT PREVIEW (first 500 chars):', prompt.substring(0, 500));
      
      // Apply production-ready LaTeX rules to the prompt
      const enhancedPrompt = this.enhanceLatexPrompt(prompt);
      
      const response = await this.client.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: enhancedPrompt,
        config: {
          temperature: 0.1, // Lower temperature for more consistent LaTeX syntax
          topK: 20,
          topP: 0.7,
          maxOutputTokens: 50000,
          candidateCount: 1,
        },
      });
      
      console.log('🔍 RAW API RESPONSE OBJECT KEYS:', Object.keys(response));
      console.log('🔍 RAW API RESPONSE STRUCTURE:', JSON.stringify(response, null, 2).substring(0, 500));
      
      // Enhanced text extraction with multiple fallback strategies
      let rawText = '';
      const responseAny = response as any;
      
      if (responseAny.text) {
        rawText = responseAny.text;
      } else if (responseAny.candidates && Array.isArray(responseAny.candidates) && responseAny.candidates.length > 0) {
        const candidate = responseAny.candidates[0];
        if (candidate.content && candidate.content.parts && Array.isArray(candidate.content.parts) && candidate.content.parts.length > 0) {
          rawText = candidate.content.parts[0].text || '';
        } else if (candidate.text) {
          rawText = candidate.text;
        } else if (typeof candidate === 'string') {
          rawText = candidate;
        }
      } else if (responseAny.content && responseAny.content.parts && Array.isArray(responseAny.content.parts) && responseAny.content.parts.length > 0) {
        rawText = responseAny.content.parts[0].text || '';
      } else if (responseAny.parts && Array.isArray(responseAny.parts) && responseAny.parts.length > 0) {
        rawText = responseAny.parts[0].text || '';
      }
      
      if (!rawText) {
        console.error('❌ Unexpected response structure:', JSON.stringify(response, null, 2));
        throw new Error('Unable to extract text from Gemini response');
      }
      
      console.log('🔍 EXTRACTED TEXT LENGTH:', rawText.length);
      if (rawText.length > 0) {
        console.log('🔍 TEXT PREVIEW:', rawText.substring(0, 200));
      }
      
      if (!rawText) {
        throw new Error('No text extracted from Gemini response');
      }
      
      // Apply LaTeX validation and fixes to the output
      const validatedLatex = this.validateAndFixLatexOutput(rawText);
      
      return validatedLatex;
    } catch (error) {
      console.error('❌ LaTeX generation error:', error);
      throw new Error(`Failed to generate LaTeX: ${error.message}`);
    }
  }

  async generateAdvancedCoverLetterVariations(options: {
    personalInfo: any;
    jobDescription: string;
    jobTitle: string;
    companyName: string;
    resumeData?: any;
    variationCount?: number;
  }): Promise<{ tone: string; content: string; strengths: string[]; }[]> {
    try {
      const { personalInfo, jobDescription, jobTitle, companyName, resumeData, variationCount = 3 } = options;
      
      const tones = ['professional', 'enthusiastic', 'conservative'] as const;
      const variations = [];
      
      for (const tone of tones.slice(0, variationCount)) {
        const content = await this.generateCoverLetter({
          personalInfo,
          jobDescription,
          jobTitle,
          companyName,
          tone,
          resumeData,
          keywordOptimization: true
        });
        
        // Analyze strengths of this variation
        const strengths = this.analyzeCoverLetterStrengths(content, tone, jobDescription);
        
        variations.push({ tone, content, strengths });
      }
      
      return variations;
    } catch (error) {
      console.error('Error generating cover letter variations:', error);
      throw new Error('Failed to generate cover letter variations');
    }
  }
  
  private analyzeCoverLetterStrengths(content: string, tone: string, jobDescription: string): string[] {
    const strengths = [];
    const wordCount = content.split(/\s+/).length;
    
    // Analyze various aspects
    if (wordCount >= 250 && wordCount <= 400) {
      strengths.push('Optimal length for recruiter attention');
    }
    
    if (content.includes('specific') || content.includes('metrics') || /\d+%/.test(content)) {
      strengths.push('Includes quantified achievements');
    }
    
    if (content.toLowerCase().includes(jobDescription.toLowerCase().split(' ')[0])) {
      strengths.push('Strong keyword alignment');
    }
    
    const toneStrengths = {
      professional: 'Maintains professional tone throughout',
      enthusiastic: 'Shows genuine passion and enthusiasm',
      conservative: 'Demonstrates reliability and stability',
      casual: 'Balances friendliness with professionalism'
    };
    
    strengths.push(toneStrengths[tone as keyof typeof toneStrengths]);
    
    if (content.includes('research') || content.includes('company')) {
      strengths.push('Shows company research and interest');
    }
    
    return strengths;
  }

  async generateText(prompt: string, retryCount: number = 0): Promise<string> {
    if (!this.client) {
      throw new Error('Gemini API not configured. Please set GEMINI_API_KEY environment variable.');
    }
    
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second base delay
    
    try {
      // Standard generation for all content - removed automatic LaTeX detection
      console.log('📝 STANDARD GENERATION - PROMPT LENGTH:', prompt.length);
      if (retryCount > 0) {
        console.log(`🔄 RETRY ATTEMPT ${retryCount}/${maxRetries}`);
      }
      
      const response = await this.client.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      console.log('🔍 STANDARD RAW API RESPONSE KEYS:', Object.keys(response));
      
      // Enhanced text extraction with multiple fallback strategies
      let text = '';
      const responseAny = response as any;
      
      if (responseAny.text) {
        text = responseAny.text;
      } else if (responseAny.candidates && Array.isArray(responseAny.candidates) && responseAny.candidates.length > 0) {
        const candidate = responseAny.candidates[0];
        if (candidate.content && candidate.content.parts && Array.isArray(candidate.content.parts) && candidate.content.parts.length > 0) {
          text = candidate.content.parts[0].text || '';
        } else if (candidate.text) {
          text = candidate.text;
        } else if (typeof candidate === 'string') {
          text = candidate;
        }
      } else if (responseAny.content && responseAny.content.parts && Array.isArray(responseAny.content.parts) && responseAny.content.parts.length > 0) {
        text = responseAny.content.parts[0].text || '';
      } else if (responseAny.parts && Array.isArray(responseAny.parts) && responseAny.parts.length > 0) {
        text = responseAny.parts[0].text || '';
      }
      
      if (!text) {
        console.error('❌ Unexpected response structure:', JSON.stringify(response, null, 2));
        throw new Error('Unable to extract text from Gemini response');
      }
      
      console.log('🔍 STANDARD EXTRACTED TEXT LENGTH:', text.length);
      
      return text;
    } catch (error) {
      console.error('❌ CRITICAL: Gemini generateText error:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        status: error.status,
        statusCode: error.statusCode,
        details: error.details,
        retryCount,
        fullError: error
      });
      
      // Handle quota exceeded error with fallback
      if (error.message && error.message.includes('429') && error.message.includes('quota')) {
        console.error('❌ Gemini API quota exceeded. Using fallback basic template.');
        throw new Error('AI_QUOTA_EXCEEDED');
      }
      
      // Handle authentication errors (don't retry these)
      if (error.message && (error.message.includes('API_KEY') || error.message.includes('authentication'))) {
        console.error('❌ Gemini API authentication error - check GEMINI_API_KEY');
        throw new Error('AI_AUTH_ERROR');
      }
      
      // Handle retryable errors (500, network issues, rate limits)
      const isRetryableError = 
        error.message.includes('500 Internal Server Error') ||
        error.message.includes('502 Bad Gateway') ||
        error.message.includes('503 Service Unavailable') ||
        error.message.includes('504 Gateway Timeout') ||
        error.message.includes('network') ||
        error.message.includes('timeout') ||
        error.message.includes('INTERNAL');
      
      if (isRetryableError && retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
        console.log(`🔄 Retryable error detected, waiting ${delay}ms before retry ${retryCount + 1}/${maxRetries}`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.generateText(prompt, retryCount + 1);
      }
      
      // Handle other API errors
      if (error.message && error.message.includes('GoogleGenAIError')) {
        console.error('❌ Google Generative AI error:', error.message);
        throw new Error('AI_SERVICE_ERROR');
      }
      
      throw new Error(`Failed to generate text after ${retryCount} retries: ${error.message}`);
    }
  }

  /**
   * Enhance LaTeX prompts with production-ready rules from infotouse.md
   */
  private enhanceLatexPrompt(prompt: string): string {
    const latexRules = `
🚨 ULTRA-CRITICAL LATEX RULES - THESE SPECIFIC ERRORS CAUSE IMMEDIATE FAILURE:

## ❌ FATAL ERROR #1: Content Before \\begin{document}
🚨 NEVER PUT ANY CONTENT (text, sections, commands) BEFORE \\begin{document}
✅ CORRECT ORDER:
\\documentclass[11pt, letterpaper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage[hidelinks]{hyperref}

% ONLY custom command definitions here - NO content
\\newcommand{\\resumeItem}[1]{\\item\\small{#1}}

\\begin{document}
% ALL ACTUAL CONTENT GOES HERE - sections, text, everything
\\section{Education}
\\textbf{John Doe}
\\end{document}

❌ WRONG - WILL FAIL:
\\documentclass{article}
\\section{Education}  % ← FATAL: content before \\begin{document}
\\begin{document}
\\end{document}

## ❌ FATAL ERROR #2: Malformed \\newcommand Syntax
🚨 THESE CAUSE endcsname ERRORS - NEVER USE:
❌ \\newcommand\\*\\  (incomplete syntax)
❌ \\newcommand\\*   (missing braces)
❌ ewcommand        (missing backslash)

✅ CORRECT SYNTAX ONLY:
\\newcommand{\\mycommand}[1]{#1}
\\newcommand*{\\mycommand}[2]{#1 #2}

## ❌ FATAL ERROR #3: \\uppercase Commands
🚨 THESE CAUSE Missing \\endcsname ERRORS:
❌ {\\uppercase}     (incomplete)
❌ \\uppercase       (without braces)

✅ CORRECT REPLACEMENT:
\\MakeUppercase{text}

## Document Structure - EXACT Template
\\documentclass[11pt, letterpaper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage[hidelinks]{hyperref}

% Custom commands ONLY (no content)
\\newcommand{\\resumeItem}[1]{\\item\\small{#1 \\vspace{-2pt}}}

\\begin{document}
% ALL content here: sections, text, formatting
\\end{document}

## Package Safety - ONLY These Are Safe
APPROVED PACKAGES:
- \\usepackage[utf8]{inputenc}
- \\usepackage[T1]{fontenc}  
- \\usepackage{geometry}
- \\usepackage{enumitem}
- \\usepackage{titlesec}
- \\usepackage[hidelinks]{hyperref} (MUST be last)

BANNED (cause failures): fontspec, charter, cmbright, lato, paracol, multicol

## Character Escaping
& → \\&
% → \\%  
# → \\#
_ → \\_
C++ → C\\+\\+

## Environment Safety
Every \\begin{X} needs \\end{X}:
\\begin{itemize}
\\item First item
\\end{itemize}

## OUTPUT RULES - NO EXCEPTIONS
1. Start IMMEDIATELY with \\documentclass
2. NO explanatory text (Here is..., This code...)
3. NO markdown (backticks)
4. End with \\end{document}
5. MUST compile with pdflatex

## VALIDATION CHECKLIST - Check Before Output:
- [ ] Starts with \\documentclass
- [ ] NO content before \\begin{document}
- [ ] All \\newcommand properly formatted
- [ ] NO \\uppercase commands
- [ ] All braces balanced
- [ ] All environments closed
- [ ] Special characters escaped

`;

    return `${latexRules}

${prompt}

🚨 CRITICAL: Follow the validation checklist above. Generate ONLY valid LaTeX code that will compile without errors.`;
  }

  /**
   * Validate and fix LaTeX output using rules from infotouse.md
   */
  private validateAndFixLatexOutput(rawText: string): string {
    let latex = rawText.trim();
    
    console.log('🧹 Starting AGGRESSIVE LaTeX validation and fixes...');
    console.log(`📝 Input length: ${latex.length} chars`);
    
    // 1. AGGRESSIVE: Remove ALL explanatory text patterns
    latex = latex.replace(/^.*?Here\s+is\s+the.*?(?=\\documentclass|$)/is, '');
    latex = latex.replace(/^.*?This\s+is\s+the.*?(?=\\documentclass|$)/is, '');
    latex = latex.replace(/^.*?Below\s+is\s+the.*?(?=\\documentclass|$)/is, '');
    latex = latex.replace(/^.*?corrected.*?code.*?(?=\\documentclass|$)/is, '');
    latex = latex.replace(/^```(?:latex|tex)?\s*/gmi, '');
    latex = latex.replace(/```\s*$/gm, '');
    latex = latex.replace(/^\s*`+\s*/gm, '');
    latex = latex.replace(/\s*`+\s*$/gm, '');
    
    // 2. Find LaTeX content boundaries more aggressively
    const docClassMatch = latex.match(/\\documentclass(?:\[[^\]]*\])?\{[^}]+\}/);
    if (docClassMatch) {
      const docClassStart = latex.indexOf(docClassMatch[0]);
      if (docClassStart > 0) {
        console.log(`🔧 Removing ${docClassStart} chars before \\documentclass`);
        latex = latex.substring(docClassStart);
      }
    }
    
    const endDocIndex = latex.lastIndexOf('\\end{document}');
    if (endDocIndex > -1) {
      latex = latex.substring(0, endDocIndex + '\\end{document}'.length);
    }
    
    // 3. ULTRA-AGGRESSIVE FIX: Move ALL content that's before \begin{document}
    const beginDocIndex = latex.indexOf('\\begin{document}');
    const docClassMatch2 = latex.match(/\\documentclass(?:\[[^\]]*\])?\{[^}]+\}/);
    
    if (beginDocIndex > -1 && docClassMatch2) {
      const docClassEnd = latex.indexOf(docClassMatch2[0]) + docClassMatch2[0].length;
      const preamble = latex.substring(0, beginDocIndex);
      const content = latex.substring(beginDocIndex);
      
      console.log(`🔧 Analyzing preamble length: ${preamble.length} chars`);
      console.log(`🔧 Preamble content: "${preamble.substring(docClassEnd, Math.min(docClassEnd + 200, preamble.length))}"`);
      
      // Extract any content that should be inside document (much broader pattern)
      const contentBeforeBegin = preamble.substring(docClassEnd);
      
      // Find ALL problematic content patterns
      const problematicPatterns = [
        /\\section\*?\{[^}]*\}/g,
        /\\subsection\*?\{[^}]*\}/g,
        /\\textbf\{[^}]*\}/g,
        /\\textit\{[^}]*\}/g,
        /\\emph\{[^}]*\}/g,
        /\\item\s+[^\n\\]*/g,
        /\\maketitle/g,
        /\\noindent\s+[^\n\\]*/g,
        /\\vspace\{[^}]*\}/g,
        /\\hspace\{[^}]*\}/g,
        /\\centerline\{[^}]*\}/g,
        /\\centering/g,
        /\\large\s+[^\n\\]*/g,
        /\\Large\s+[^\n\\]*/g,
        /\\huge\s+[^\n\\]*/g,
        /\\begin\{center\}[\s\S]*?\\end\{center\}/g,
        /\\begin\{itemize\}[\s\S]*?\\end\{itemize\}/g,
        /\\begin\{enumerate\}[\s\S]*?\\end\{enumerate\}/g,
        // Match any standalone text content (not comments, not package commands)
        /^[^%\\][^\n]*$/gm
      ];
      
      let allProblematicContent = [];
      let cleanedContentBeforeBegin = contentBeforeBegin;
      
      for (const pattern of problematicPatterns) {
        const matches = contentBeforeBegin.match(pattern);
        if (matches) {
          allProblematicContent.push(...matches);
          // Remove from preamble
          cleanedContentBeforeBegin = cleanedContentBeforeBegin.replace(pattern, '');
        }
      }
      
      if (allProblematicContent.length > 0) {
        console.log(`🚨 ULTRA-AGGRESSIVE FIX: Moving ${allProblematicContent.length} content items inside document`);
        console.log(`🚨 Problematic content: ${allProblematicContent.slice(0, 3).join(', ')}...`);
        
        // Build clean preamble
        let cleanPreamble = latex.substring(0, docClassEnd);
        
        // Add essential packages if missing
        const essentialPackages = [
          '\\usepackage[utf8]{inputenc}',
          '\\usepackage[T1]{fontenc}', 
          '\\usepackage{geometry}',
          '\\usepackage{enumitem}',
          '\\usepackage{titlesec}',
          '\\usepackage[hidelinks]{hyperref}'
        ];
        
        for (const pkg of essentialPackages) {
          if (!cleanPreamble.includes(pkg)) {
            cleanPreamble += '\n' + pkg;
          }
        }
        
        // Add any legitimate preamble content (newcommand, etc.)
        const legitimatePreambleContent = cleanedContentBeforeBegin
          .split('\n')
          .filter(line => {
            const trimmed = line.trim();
            return trimmed.startsWith('\\newcommand') || 
                   trimmed.startsWith('\\renewcommand') ||
                   trimmed.startsWith('\\def') ||
                   trimmed.startsWith('%') ||
                   trimmed === '';
          })
          .join('\n');
        
        if (legitimatePreambleContent.trim()) {
          cleanPreamble += '\n' + legitimatePreambleContent;
        }
        
        // Move ALL problematic content inside document
        const fixedContent = content.replace('\\begin{document}', 
          '\\begin{document}\n\n' + allProblematicContent.join('\n') + '\n');
        
        latex = cleanPreamble + '\n\n' + fixedContent;
        console.log(`✅ Content restructuring complete. New length: ${latex.length}`);
      }
    }
    
    // 4. ULTRA-AGGRESSIVE FIX: Fix ALL malformed newcommand syntax
    console.log('🔧 Fixing newcommand syntax issues...');
    
    // Count problematic patterns before fixing
    const problematicNewcommands = [
      latex.match(/\\newcommand\*\\[a-zA-Z]+(?!\{)/g) || [],
      latex.match(/\\renewcommand\*\\[a-zA-Z]+(?!\{)/g) || [],
      latex.match(/\\newcommand\\[a-zA-Z]+(?!\{)/g) || [],
      latex.match(/ewcommand/g) || [],
      latex.match(/\\newcommand\*\\\s*$/gm) || [],
      latex.match(/\\newcommand\\\s*$/gm) || []
    ];
    
    const totalProblematic = problematicNewcommands.reduce((sum, arr) => sum + arr.length, 0);
    if (totalProblematic > 0) {
      console.log(`🚨 Found ${totalProblematic} malformed newcommand patterns - fixing aggressively`);
    }
    
    // Fix all malformed patterns
    latex = latex.replace(/\\newcommand\*\\([a-zA-Z]+)(?!\{)/g, '\\newcommand*{\\$1}');
    latex = latex.replace(/\\renewcommand\*\\([a-zA-Z]+)(?!\{)/g, '\\renewcommand*{\\$1}');
    latex = latex.replace(/\\newcommand\\([a-zA-Z]+)(?!\{)/g, '\\newcommand{\\$1}');
    latex = latex.replace(/\\renewcommand\\([a-zA-Z]+)(?!\{)/g, '\\renewcommand{\\$1}');
    latex = latex.replace(/ewcommand/g, '\\newcommand');
    
    // Fix incomplete newcommand patterns - remove entirely
    latex = latex.replace(/\\newcommand\*\\\s*$/gm, '% incomplete newcommand removed');
    latex = latex.replace(/\\newcommand\\\s*$/gm, '% incomplete newcommand removed');
    latex = latex.replace(/\\newcommand\*\s*$/gm, '% incomplete newcommand removed');
    latex = latex.replace(/\\renewcommand\*\\\s*$/gm, '% incomplete renewcommand removed');
    
    // Fix other malformed command patterns
    latex = latex.replace(/\\newcommand\{\\([a-zA-Z]+)\}\*\{/g, '\\newcommand*{\\$1}{');
    latex = latex.replace(/\\newcommand\{\\([a-zA-Z]+)\}\*/g, '\\newcommand*{\\$1}');
    
    // Remove orphaned backslashes that could cause issues
    latex = latex.replace(/\\(\s*\n)/g, '% orphaned backslash removed$1');
    
    console.log('✅ Newcommand syntax fixing complete');
    
    // 5. CRITICAL FIX: Fix uppercase command issues (causes Missing \endcsname)
    latex = latex.replace(/\{\\uppercase\}/g, '{\\MakeUppercase{#1}}');
    latex = latex.replace(/\\uppercase(?!\{)/g, '\\MakeUppercase');
    latex = latex.replace(/\\uppercase\{#1\}/g, '\\MakeUppercase{#1}');
    
    // 6. Fix banned packages
    const bannedPackages = ['fontspec', 'charter', 'cmbright', 'lato', 'paracol', 'multicol', 'kpfonts'];
    for (const pkg of bannedPackages) {
      latex = latex.replace(new RegExp(`\\\\usepackage(?:\\[[^\\]]*\\])?\\{${pkg}\\}`, 'g'), 
        `% ${pkg} removed - incompatible with pdflatex`);
    }
    
    // 7. Fix bracket syntax in packages
    latex = latex.replace(/\\usepackage\[([^\]]+)\)\{([^}]+)\}/g, '\\usepackage[$1]{$2}');
    
    // 8. Ensure proper document structure
    if (!latex.includes('\\begin{document}')) {
      const docClassEnd = latex.search(/\\documentclass(?:\[[^\]]*\])?\{[^}]+\}/);
      if (docClassEnd > -1) {
        const insertPos = latex.indexOf('}', docClassEnd) + 1;
        latex = latex.slice(0, insertPos) + '\n\\begin{document}\n' + latex.slice(insertPos);
      } else {
        latex = '\\documentclass[11pt, letterpaper]{article}\n\\begin{document}\n' + latex;
      }
    }
    
    if (!latex.includes('\\end{document}')) {
      latex += '\n\\end{document}';
    }
    
    // 9. Fix unmatched braces more carefully
    const openCount = (latex.match(/\{/g) || []).length;
    const closeCount = (latex.match(/\}/g) || []).length;
    if (openCount > closeCount) {
      const endDoc = latex.lastIndexOf('\\end{document}');
      if (endDoc > -1) {
        const missing = '}}'.repeat(openCount - closeCount);
        latex = latex.slice(0, endDoc) + missing + '\n' + latex.slice(endDoc);
        console.log(`🔧 Added ${openCount - closeCount} missing closing braces`);
      }
    }
    
    // 10. Escape special characters
    latex = latex.replace(/([^\\])&/g, '$1\\&');
    latex = latex.replace(/([^\\])%/g, '$1\\%');
    latex = latex.replace(/([^\\])#/g, '$1\\#');
    latex = latex.replace(/([^\\])_/g, '$1\\_');
    latex = latex.replace(/C\+\+/g, 'C\\+\\+');
    
    console.log(`✅ AGGRESSIVE LaTeX fixes completed. Output length: ${latex.length} chars`);
    console.log(`🔍 Starts with \\documentclass: ${latex.startsWith('\\documentclass')}`);
    console.log(`🔍 Contains \\begin{document}: ${latex.includes('\\begin{document}')}`);
    console.log(`🔍 Ends with \\end{document}: ${latex.includes('\\end{document}')}`);
    
    return latex;
  }

  async enhanceContent(options: {
    content: string;
    jobDescription?: string;
    focusAreas?: string[];
    tone?: string;
  }): Promise<{ enhancedContent: string; improvements: string[]; }> {
    if (!this.client) {
      throw new Error('Gemini API not configured. Please set GEMINI_API_KEY environment variable.');
    }

    const { content, jobDescription, focusAreas = [], tone = 'professional' } = options;

    const prompt = `
You are an expert writing coach specializing in professional communication. Enhance this cover letter content to make it more compelling, impactful, and effective.

CURRENT CONTENT:
${content}

${jobDescription ? `JOB CONTEXT: ${jobDescription}` : ''}

ENHANCEMENT FOCUS: ${focusAreas.length > 0 ? focusAreas.join(', ') : 'Overall improvement'}
DESIRED TONE: ${tone}

Please enhance the content by:
1. Strengthening language and impact
2. Adding compelling storytelling elements
3. Improving flow and readability
4. Enhancing professional presentation
5. Optimizing for the specified tone
6. Adding more specific value propositions
${jobDescription ? '7. Better aligning with job requirements' : ''}

Return as JSON in this exact format:
{
  "enhancedContent": "The improved cover letter content here...",
  "improvements": ["specific improvement 1", "specific improvement 2", "specific improvement 3", "specific improvement 4"]
}

The enhanced content should:
- Maintain the original intent and key information
- Be more engaging and persuasive
- Flow better between paragraphs
- Use stronger action verbs and descriptive language
- Include specific examples where appropriate
- Sound natural and authentic
- Be appropriate for the specified tone

Respond only with the JSON object, no additional text.
`;

    try {
      console.log('🤖 Sending enhancement request to Gemini...');
      const response = await this.client.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      const text = response.text;
      
      console.log('📝 Raw Gemini response (first 200 chars):', text.substring(0, 200));
      
      try {
        const enhancement = cleanAndParseJson(text);
        console.log('✅ Successfully parsed enhancement:', {
          hasEnhancedContent: !!enhancement.enhancedContent,
          enhancedContentLength: enhancement.enhancedContent?.length || 0,
          improvementsCount: enhancement.improvements?.length || 0
        });
        
        return {
          enhancedContent: enhancement.enhancedContent || content,
          improvements: enhancement.improvements || ['Content enhanced with AI assistance']
        };
      } catch (parseError) {
        console.error('❌ Failed to parse JSON, attempting direct text return:', parseError);
        // If JSON parsing fails, try to use the raw text as enhanced content
        if (text && text.length > content.length * 0.8) {
          // Only use if the response is substantial
          return {
            enhancedContent: text.replace(/```json|```|^\s*{.*}\s*$/gm, '').trim(),
            improvements: ['Enhanced using AI (direct text response)']
          };
        }
        throw parseError;
      }
    } catch (error) {
      console.error('❌ Error enhancing content:', error);
      return {
        enhancedContent: content,
        improvements: ['Unable to enhance content at this time']
      };
    }
  }

  /**
   * Scrape job posting from URL and extract structured information
   */
  async scrapeJobFromUrl(jobUrl: string, resumeData?: any, retryCount: number = 0): Promise<{
    jobDescription: string;
    jobTitle: string;
    companyName: string;
    requirements: string[];
    benefits: string[];
    location?: string;
    salary?: string;
    // Additional properties that the code expects
    requiredSkills?: string[];
    preferredSkills?: string[];
    experienceLevel?: string;
    responsibilities?: string[];
    qualifications?: string[];
    keywords?: string[];
    recommendations?: string[];
    _resilience?: any;
  }> {
    if (!this.client) {
      throw new Error('Gemini API not configured');
    }

    const maxRetries = 3;
    const baseDelay = 2000; // 2 second base delay for job scraping
    const modelToUse = this.getSmartModel("gemini-3-flash-preview");

    try {
      console.log(`🔍 [RESILIENCE] Scraping job from URL using ${modelToUse}:`, jobUrl);
      
      const prompt = `
You are a world-class Executive Headhunter and Senior Recruitment Strategist with advanced web analysis capabilities. Your mission is to perform a deep-dive analysis of the job posting at the provided URL and extract high-fidelity, actionable data.

🎯 TARGET JOB POSTING:
${jobUrl}

📋 STRATEGIC ANALYSIS PROTOCOL:
1. DEEP SCRAPE: Read the full text, including the fine print, about the role, company culture, and technical ecosystem.
2. GRANULAR EXTRACTION: Do not provide generic summaries. Extract specific tools, versions, methodologies, and internal team dynamics mentioned.
3. CONTEXTUAL JOB DESCRIPTION: Reconstruct a high-impact, 4-paragraph description:
   - Para 1: Mission & Impact (Why does this role exist? What's the "big picture"?)
   - Para 2: Technical/Functional Ecosystem (Tools, workflows, and standards)
   - Para 3: Success Parameters (What does "winning" look like in the first 6-12 months?)
   - Para 4: Cultural & Growth Vectors (Team vibe and career trajectory)
4. EXHAUSTIVE ARRAYS: Provide 8-12 distinct, high-value items for requirements, responsibilities, and skills.

🔍 REQUIRED OUTPUT FORMAT (STRICT PURE JSON):
{
  "jobTitle": "full official job title",
  "companyName": "legal or well-known trade name of the company",
  "location": "City, State/Province, Country (specify if Remote/Hybrid)",
  "jobDescription": "Detailed 4-paragraph strategic overview (min 250 words).",
  "requirements": [
    "Hard Requirement: specific degree/years",
    "Technical Mastery: specific tool/stack",
    "Soft Power: specific leadership/comm trait",
    "Industry Context: specific sector knowledge",
    "Bonus/Preferred: specific 'nice-to-have' skill"
  ],
  "responsibilities": [
    "Daily Execution: specific primary task",
    "Strategic Contribution: specific ownership area",
    "Cross-functional: specific collaboration node",
    "Technical Leadership: specific mentoring/standard area"
  ],
  "skills": [
    "Primary Tech Stack item",
    "Secondary Tool/Framework",
    "Methodology (Agile/Scrum/etc)",
    "Soft Skill Context (Stakeholder mgmt/etc)"
  ],
  "experienceLevel": "entry|mid|senior|lead|staff|principal|executive",
  "employmentType": "full-time|contract|part-time|freelance",
  "salary": "Full compensation details (Base + Bonus + Equity if mentioned)",
  "benefits": [
    "Health/Wellness specific details",
    "Financial/Equity specific details",
    "Work-Life/Flexibility specific details",
    "Growth/Education specific details"
  ],
  "companyInfo": {
    "industry": "Primary industry sector",
    "size": "exact employee count or range",
    "description": "3-sentence strategic mission statement and market status."
  },
  "strategicInsights": [
    "Candidate Positioning: how to frame the resume for this specific company",
    "Keyword Priority: the top 3 'must-have' terms for ATS",
    "Interview Strategy: potential 'gotcha' questions based on the job's pain points",
    "Competitive Edge: what specific achievement would make a candidate irresistible"
  ],
  "confidence": 95
}

🚨 CRITICAL EXECUTION RULES:
- Use PLAIN TEXT ONLY. NO markdown bold (**), italics (*), or bullet symbols inside JSON strings.
- Be extremely specific. Use the exact technical terms found in the posting.
- Ensure the 'strategicInsights' are high-value and tailored to this specific posting.
- Return ONLY the JSON object.

${resumeData ? `CANDIDATE'S RESUME DATA FOR CONTEXT:
${JSON.stringify(resumeData, null, 2)}` : ''}

ANALYZE THE JOB POSTING AT ${jobUrl} NOW:
`;

      const response = await this.client.models.generateContent({
        model: modelToUse,
        contents: prompt,
      });
      
      // ... existing text extraction and cleaning logic ...
      let text = '';
      const responseAny = response as any;
      if (responseAny.text) {
        text = responseAny.text;
      } else if (responseAny.candidates?.[0]?.content?.parts?.[0]?.text) {
        text = responseAny.candidates[0].content.parts[0].text;
      }
      
      if (!text) throw new Error('Empty response from AI');

      try {
        let cleanedText = text.replace(/```json|```/g, '').trim();
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) cleanedText = jsonMatch[0];
        
        const jobData = JSON.parse(cleanedText);
        
        // Clean markdown helper
        const cm = (t: string): string => t.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').trim();
        const ca = (arr: any[]): string[] => (arr || []).map(i => cm(String(i)));

        return {
          jobDescription: jobData.jobDescription || '',
          jobTitle: jobData.jobTitle || 'Job Title Not Found',
          companyName: jobData.companyName || 'Company Not Found',
          requirements: ca(jobData.requirements),
          benefits: ca(jobData.benefits),
          location: jobData.location,
          salary: jobData.salary,
          requiredSkills: ca(jobData.requiredSkills),
          preferredSkills: ca(jobData.preferredSkills),
          experienceLevel: jobData.experienceLevel,
          responsibilities: ca(jobData.responsibilities),
          qualifications: ca(jobData.qualifications),
          keywords: ca(jobData.keywords),
          recommendations: ca(jobData.recommendations),
          strategicInsights: ca(jobData.strategicInsights),
          companyInfo: jobData.companyInfo || {},
          _resilience: {
            model: modelToUse,
            isFallback: modelToUse !== "gemini-3-flash-preview"
          }
        };
      } catch (parseError) {
        // ... existing fallback for parse error ...
        throw parseError;
      }
    } catch (error: any) {
      console.error(`❌ Error scraping job using ${modelToUse}:`, error.message);

      // Handle 429/Quota/503 errors with immediate model fallback
      if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('503')) {
        this.markModelExhausted(modelToUse);
        if (modelToUse !== "gemini-1.5-flash") {
          console.log(`🔄 [RESILIENCE] Quota hit on ${modelToUse}, retrying with next model...`);
          return this.scrapeJobFromUrl(jobUrl, resumeData, retryCount);
        }
        throw new Error('AI_QUOTA_EXCEEDED');
      }
      
      // Standard network retries
      if (retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.scrapeJobFromUrl(jobUrl, resumeData, retryCount + 1);
      }
      
      throw error;
    }
  }
}

export const geminiService = new GeminiService();

export const getGeminiStream = async (prompt: string): Promise<NodeJS.ReadableStream> => {
  if (!genAI) {
    throw new Error('Gemini API not configured. Please set GEMINI_API_KEY environment variable.');
  }

  try {
    const result = await genAI.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    // Create a readable stream that will emit the streaming response
    const { Readable } = require('stream');
    
    const stream = new Readable({
      read() {}
    });

    // Process the stream asynchronously
    (async () => {
      try {
        for await (const chunk of result) {
          const chunkText = chunk.text;
          if (chunkText) {
            stream.push(chunkText);
          }
        }
        stream.push(null); // End the stream
      } catch (error) {
        console.error('Error in Gemini stream processing:', error);
        stream.destroy(error as Error);
      }
    })();

    return stream;
  } catch (error) {
    console.error('Error creating Gemini stream:', error);
    throw new Error('Failed to create AI stream');
  }
};