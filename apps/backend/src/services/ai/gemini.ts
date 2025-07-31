import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;

if (API_KEY) {
  genAI = new GoogleGenerativeAI(API_KEY);
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
    
    // Remove common prefixes/suffixes AI might add
    .replace(/^Here's the JSON:?\s*/i, '')
    .replace(/^The JSON response is:?\s*/i, '')
    .replace(/^Response:?\s*/i, '')
    .replace(/\s*That's the analysis\.?$/i, '')
    
    // Clean whitespace
    .trim();
  
  // Extract JSON object - find the FIRST complete JSON object
  const jsonRegex = /\{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*\}/;
  const jsonMatch = cleanedText.match(jsonRegex);
  
  if (jsonMatch) {
    cleanedText = jsonMatch[0];
    console.log('✂️ Extracted JSON object (first 200 chars):', cleanedText.substring(0, 200));
  } else {
    console.log('⚠️ No JSON object pattern found, using full cleaned text');
  }
  
  // Final cleanup
  cleanedText = cleanedText.trim();
  
  console.log('🧹 Final cleaned text (first 200 chars):', cleanedText.substring(0, 200));
  console.log('🧹 Final cleaned text (last 50 chars):', cleanedText.substring(Math.max(0, cleanedText.length - 50)));
  
  try {
    const parsed = JSON.parse(cleanedText);
    console.log('✅ JSON parsed successfully!');
    return parsed;
  } catch (error) {
    console.error('❌ FINAL JSON PARSE FAILED:');
    console.error('Raw length:', rawText.length);
    console.error('Cleaned length:', cleanedText.length);
    console.error('First 500 chars of cleaned text:', cleanedText.substring(0, 500));
    console.error('Parse error:', error.message);
    
    // Try one more desperate attempt - look for any JSON-like structure
    const desperateMatch = rawText.match(/\{[\s\S]*?"matchScore"[\s\S]*?\}/);
    if (desperateMatch) {
      console.log('🚨 Attempting desperate JSON extraction...');
      try {
        return JSON.parse(desperateMatch[0]);
      } catch (e) {
        console.log('💥 Desperate attempt also failed');
      }
    }
    
    throw new Error(`🚨 AI job match analysis service failed: ${error.message}. Raw response: ${rawText.substring(0, 100)}...`);
  }
}

export class GeminiService {
  public model = genAI?.getGenerativeModel({ model: 'gemini-2.5-flash' }) || null;

  async optimizeResume(params: ResumeOptimizationParams): Promise<any> {
    if (!this.model) {
      throw new Error('Gemini API not configured. Please set GEMINI_API_KEY environment variable.');
    }
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
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse the JSON response
      const optimizedResume = cleanAndParseJson(text);
      return optimizedResume;
    } catch (error) {
      console.error('Error optimizing resume with Gemini:', error);
      throw new Error('Failed to optimize resume');
    }
  }

  async generateCoverLetter(options: {
    personalInfo: any;
    jobDescription: string;
    jobTitle: string;
    companyName: string;
    tone: 'professional' | 'casual' | 'enthusiastic' | 'conservative';
    resumeData?: any;
    customInstructions?: string;
    keywordOptimization?: boolean;
  }): Promise<string> {
    if (!this.model) {
      throw new Error('Gemini API not configured. Please set GEMINI_API_KEY environment variable.');
    }
    
    const { 
      personalInfo, 
      jobDescription, 
      jobTitle, 
      companyName, 
      tone, 
      resumeData, 
      customInstructions,
      keywordOptimization = true 
    } = options;
    
    // Extract key information from resume for intelligent matching
    const workExperience = resumeData?.workExperience || [];
    const skills = resumeData?.skills || [];
    const education = resumeData?.education || [];
    const achievements = workExperience.flatMap((exp: any) => exp.achievements || []);
    
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
Name: ${personalInfo.firstName} ${personalInfo.lastName}
Email: ${personalInfo.email}
Location: ${personalInfo.location}
Professional Title: ${personalInfo.professionalTitle || 'Professional'}

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

1. OPENING HOOK (2-3 sentences):
   - Start with a compelling statement that immediately shows value
   - Reference specific company knowledge or recent company news/achievements
   - Clearly state the position and express genuine enthusiasm

2. VALUE PROPOSITION PARAGRAPH (3-4 sentences):
   - Highlight 2-3 most relevant accomplishments with specific metrics
   - Draw direct connections between experience and job requirements
   - Use power words and action verbs
   - Incorporate relevant keywords naturally

3. COMPANY ALIGNMENT PARAGRAPH (2-3 sentences):
   - Show research about the company's mission, values, or recent developments
   - Explain why you're specifically interested in THIS company
   - Connect your career goals with the company's direction

4. CLOSING CALL-TO-ACTION (2 sentences):
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
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let coverLetter = response.text();
      
      // Post-process for consistency and formatting
      coverLetter = this.postProcessCoverLetter(coverLetter, personalInfo, tone);
      
      return coverLetter;
    } catch (error) {
      console.error('Error generating cover letter with Gemini:', error);
      throw new Error('Failed to generate cover letter');
    }
  }

  async generateProfessionalSummary(resumeData: any): Promise<string> {
    if (!this.model) {
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
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error generating professional summary with Gemini:', error);
      throw new Error('Failed to generate professional summary');
    }
  }

  async generateMultipleProfessionalSummaries(resumeData: any): Promise<string[]> {
    if (!this.model) {
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

Return the response as a JSON array of exactly 3 strings:
["summary option 1", "summary option 2", "summary option 3"]

Respond only with the JSON array, no additional text.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
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
    if (!this.model) {
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
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const atsAnalysis = cleanAndParseJson(text);
      return atsAnalysis;
    } catch (error) {
      console.error('Error analyzing ATS compatibility with Gemini:', error);
      throw new Error('Failed to analyze ATS compatibility');
    }
  }

  async improveResumeWithFeedback(resumeData: any, feedback: string): Promise<any> {
    if (!this.model) {
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
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
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
    if (!this.model) {
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
      
      // Use generateContent with fresh configuration optimized for JSON
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3, // Lower temperature for more consistent JSON format
          topK: 20,         // Reduce randomness to improve JSON compliance
          topP: 0.6,        // More focused responses
          maxOutputTokens: 2048,
          candidateCount: 1,
          // responseMimeType: 'application/json', // Not supported in this version
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
      });
      
      const response = await result.response;
      const text = response.text();
      
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
    } catch (error) {
      console.error(`❌ [${analysisId}] Critical analysis failure:`, {
        error: error.message,
        stack: error.stack,
        entropy
      });
      throw new Error(`Failed to calculate job match score [${analysisId}]: ${error.message}`);
    }
  }

  async extractResumeFromText(resumeText: string): Promise<any> {
    if (!this.model) {
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
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
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

  async generateText(prompt: string): Promise<string> {
    if (!this.model) {
      throw new Error('Gemini API not configured. Please set GEMINI_API_KEY environment variable.');
    }
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating text with Gemini:', error);
      throw new Error('Failed to generate text');
    }
  }

  async enhanceContent(options: {
    content: string;
    jobDescription?: string;
    focusAreas?: string[];
    tone?: string;
  }): Promise<{ enhancedContent: string; improvements: string[]; }> {
    if (!this.model) {
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
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
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
}

export const geminiService = new GeminiService();

export const getGeminiStream = async (prompt: string): Promise<NodeJS.ReadableStream> => {
  if (!genAI) {
    throw new Error('Gemini API not configured. Please set GEMINI_API_KEY environment variable.');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  try {
    const result = await model.generateContentStream(prompt);
    
    // Create a readable stream that will emit the streaming response
    const { Readable } = require('stream');
    
    const stream = new Readable({
      read() {}
    });

    // Process the stream asynchronously
    (async () => {
      try {
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
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