
import { IJobApplication, IUserProfile } from '../models';
import { geminiService } from './ai/gemini';

export interface ResumeOptimizationSuggestion {
  section: 'experience' | 'skills' | 'summary' | 'education' | 'projects';
  priority: 'high' | 'medium' | 'low';
  suggestion: string;
  reasoning: string;
  keywords: string[];
  impact: 'increase_match' | 'improve_ats' | 'enhance_readability' | 'boost_ranking';
}

export interface JobMatchAnalysis {
  overallMatch: number; // 0-100
  skillsMatch: number;
  experienceMatch: number;
  locationMatch: number;
  salaryMatch: number;
  missingSkills: string[];
  strongPoints: string[];
  recommendations: string[];
  atsCompatibility: number;
  competitiveAdvantage: string[];
}

export interface CareerInsight {
  trend: 'growing' | 'stable' | 'declining';
  demandLevel: 'high' | 'medium' | 'low';
  averageSalary: number;
  skillsInDemand: string[];
  careerProgression: string[];
  industryOutlook: string;
  recommendedCertifications: string[];
}

class AIOptimizationService {
  async optimizeResumeForJob(
    userProfile: IUserProfile,
    jobDescription: string,
    resumeContent: string
  ): Promise<ResumeOptimizationSuggestion[]> {
    const maxRetries = 2;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 Attempt ${attempt}/${maxRetries}: Optimizing resume for job...`);
        
        const prompt = `
You are a Senior Executive Talent Architect and ATS Optimization Expert. Your goal is to transform this resume into a high-performance career document that outranks 99% of applicants for the target role.

USER STRATEGIC CONTEXT:
${JSON.stringify({
          headline: (userProfile as any).headline,
          bio: (userProfile as any).bio,
          technicalStack: (userProfile as any).technicalSkills,
          careerAspirations: (userProfile as any).preferredRoles
        }, null, 2)}

TARGET JOB BLUEPRINT:
${jobDescription}

CURRENT RESUME ASSETS:
${resumeContent}

Provide an exhaustive, high-fidelity optimization audit. Identify critical keyword gaps, semantic misalignments, and opportunities for 'Achievement Quantification'.

REQUIRED OUTPUT FORMAT (STRICT PURE JSON):
{
  "suggestions": [
    {
      "section": "experience|skills|summary|education|projects",
      "priority": "high|medium|low",
      "suggestion": "Specific, elite-level actionable advice",
      "reasoning": "Strategic explanation of how this change improves market positioning or ATS ranking",
      "keywords": ["high-value keyword 1", "high-value keyword 2"],
      "impact": "increase_match|improve_ats|enhance_readability|boost_ranking"
    }
  ]
}

CRITICAL EXECUTION RULES:
- Use PLAIN TEXT ONLY. NO markdown bold (**), italics (*), or bullet symbols inside JSON strings.
- Suggestions must be elite and specific (e.g., 'Incorporate 'Cloud-Native Architecture' into the Staff Engineer role at X' instead of 'Add more skills').
- Focus on quantifiable impact and technical mastery.
- Return ONLY the JSON object.
`;

        // Add timeout wrapper
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AI request timeout')), 45000);
        });

        const aiPromise = geminiService.client?.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
            temperature: 0.3,
            topK: 20,
            topP: 0.6,
            maxOutputTokens: 2048,
            candidateCount: 1,
          },
        });

        if (!aiPromise) {
          throw new Error('AI service not available');
        }

        const result = await Promise.race([aiPromise, timeoutPromise]) as any;
        const text = result?.text || '';

        // Enhanced JSON parsing
        try {
          let cleanedText = text.trim();
          if (cleanedText.startsWith('```json')) {
            cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }

          // Extract JSON object
          const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            cleanedText = jsonMatch[0];
          }

          const parsed = JSON.parse(cleanedText);
          
          // Validate and return suggestions
          if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
            console.log(`✅ Resume optimization succeeded on attempt ${attempt}`);
            return parsed.suggestions;
          } else {
            throw new Error('Invalid response structure - missing suggestions array');
          }
        } catch (parseError) {
          throw new Error(`JSON parsing failed: ${parseError.message}`);
        }
      } catch (error: any) {
        lastError = error;
        console.error(`❌ Resume optimization attempt ${attempt} failed:`, error.message);
        
        // If this is the last attempt, don't wait
        if (attempt < maxRetries) {
          const delay = attempt * 2000; // Exponential backoff
          console.log(`⏳ Waiting ${delay/1000}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All attempts failed, use fallback
    console.warn(`⚠️ Resume optimization failed after ${maxRetries} attempts, using fallback:`, lastError?.message);
    return this.getFallbackOptimizationSuggestions(jobDescription);
  }

  async analyzeJobMatch(
    userProfile: IUserProfile,
    jobApplication: IJobApplication
  ): Promise<JobMatchAnalysis> {
    const maxRetries = 2;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 Attempt ${attempt}/${maxRetries}: Analyzing job match...`);
        
        const prompt = `
You are an Elite Executive Search Consultant and Career Strategist. Perform a high-fidelity, multi-dimensional alignment audit between this candidate profile and the target job posting.

CANDIDATE ARCHITECTURE:
${JSON.stringify({
          headline: (userProfile as any).headline,
          bio: (userProfile as any).bio,
          tenure: userProfile.yearsOfExperience,
          technicalMastery: userProfile.technicalSkills,
          softSkills: (userProfile as any).softSkills,
          aspirations: userProfile.preferredRoles,
          geographicalNode: (userProfile as any).currentLocation
        }, null, 2)}

TARGET JOB BLUEPRINT:
${JSON.stringify({
          jobTitle: jobApplication.jobTitle,
          companyName: jobApplication.companyName,
          description: jobApplication.jobDescription,
          location: jobApplication.jobLocation
        }, null, 2)}

Provide an exhaustive match analysis in JSON format. Scores MUST be realistic and based on granular evidence.

REQUIRED OUTPUT FORMAT (STRICT PURE JSON):
{
  "overallMatch": number (0-100),
  "skillsMatch": number (0-100),
  "experienceMatch": number (0-100),
  "locationMatch": number (0-100),
  "salaryMatch": number (0-100),
  "missingSkills": ["Specific missing technical or soft skills"],
  "strongPoints": ["High-impact evidence-backed strengths"],
  "recommendations": ["Strategic advice to close the gap"],
  "atsCompatibility": number (0-100),
  "competitiveAdvantage": ["Unique traits that outrank competitors"]
}

CRITICAL EXECUTION RULES:
- Use PLAIN TEXT ONLY. NO markdown formatting (**bold**, *italics*, etc).
- Return ONLY the JSON object.
- Analysis must be critical and realistic. Avoid inflated scores.
`;

        // Add timeout wrapper
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AI request timeout')), 45000);
        });

        const aiPromise = geminiService.client?.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
            temperature: 0.3,
            topK: 20,
            topP: 0.6,
            maxOutputTokens: 1024,
            candidateCount: 1,
          },
        });

        if (!aiPromise) {
          throw new Error('AI service not available');
        }

        const result = await Promise.race([aiPromise, timeoutPromise]) as any;
        const text = result?.text || '';

        // Enhanced JSON parsing
        try {
          let cleanedText = text.trim();
          if (cleanedText.startsWith('```json')) {
            cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }

          // Extract JSON object
          const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            cleanedText = jsonMatch[0];
          }

          const parsed = JSON.parse(cleanedText);
          
          // Validate required fields
          if (typeof parsed.overallMatch === 'number' && 
              Array.isArray(parsed.missingSkills) &&
              Array.isArray(parsed.strongPoints)) {
            console.log(`✅ Job match analysis succeeded on attempt ${attempt}`);
            return parsed;
          } else {
            throw new Error('Invalid response structure');
          }
        } catch (parseError) {
          throw new Error(`JSON parsing failed: ${parseError.message}`);
        }
      } catch (error: any) {
        lastError = error;
        console.error(`❌ Attempt ${attempt} failed:`, error.message);
        
        // If this is the last attempt, don't wait
        if (attempt < maxRetries) {
          const delay = attempt * 2000; // Exponential backoff
          console.log(`⏳ Waiting ${delay/1000}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All attempts failed
    console.error('🚨 CRITICAL: Job match analysis AI service failed after all retries!');
    console.error('📋 Job Application Details:', {
      jobTitle: jobApplication.jobTitle,
      companyName: jobApplication.companyName,
      hasJobDescription: !!jobApplication.jobDescription,
      jobDescriptionLength: jobApplication.jobDescription?.length
    });
    
    // ⚠️ ENTERPRISE SECURITY: Do NOT return fallback values that cause static scores
    // This prevents the infamous 78% static score bug
    console.error('🔥 BLOCKING FALLBACK: Refusing to return static scores that mask AI service failures');
    
    // This indicates a serious problem with the AI service
    throw new Error(`🚨 AI job match analysis service failed after ${maxRetries} attempts: ${lastError?.message}. ENTERPRISE POLICY: Cannot provide inaccurate fallback scores. Fix AI service immediately.`);
  }

  async generateCareerInsights(
    userProfile: IUserProfile,
    jobMarketData?: any
  ): Promise<CareerInsight[]> {
    try {
      const prompt = `
You are a Global Labor Market Economist and Executive Career Consultant. Synthesize high-fidelity career insights and market intelligence for the following professional profile.

CANDIDATE ARCHITECTURE:
${JSON.stringify({
        headline: (userProfile as any).headline,
        tenure: userProfile.yearsOfExperience,
        technicalMastery: userProfile.technicalSkills,
        aspirations: userProfile.preferredRoles,
        industries: (userProfile as any).preferredIndustries,
        geographicalNode: (userProfile as any).currentLocation
      }, null, 2)}

Generate actionable, evidence-based market insights for each target role in JSON format.

REQUIRED OUTPUT FORMAT (STRICT PURE JSON):
{
  "insights": [
    {
      "role": "Software Engineer",
      "trend": "growing|stable|declining",
      "demandLevel": "high|medium|low",
      "averageSalary": number,
      "skillsInDemand": ["Specific modern tech stack item 1", "item 2"],
      "careerProgression": ["Next-tier role 1", "Next-tier role 2"],
      "industryOutlook": "Detailed strategic outlook on the next 24 months for this role",
      "recommendedCertifications": ["High-value certification 1", "cert 2"]
    }
  ]
}

CRITICAL EXECUTION RULES:
- Use PLAIN TEXT ONLY. NO markdown bold (**), italics (*), or other formatting.
- Salary must be realistic local or global data.
- Progression must show a clear high-growth path.
- Return ONLY the JSON object.
`;

      const result = await geminiService.client?.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      if (!result) {
        throw new Error('AI service not available');
      }
      const text = result?.text || '';

      const parsed = JSON.parse(text);
      return parsed.insights;
    } catch (error) {
      console.error('Career insights error:', error);
      return this.getFallbackCareerInsights(userProfile);
    }
  }

  async generateInterviewQuestions(
    jobApplication: IJobApplication,
    interviewType: 'behavioral' | 'technical' | 'case_study' | 'general'
  ): Promise<{
    questions: string[];
    suggestedAnswers: { question: string; keyPoints: string[]; sampleAnswer: string; }[];
  }> {
    try {
      const prompt = `
You are a Senior Technical Lead and Principal Hiring Manager at a Tier-1 Global Organization. Generate high-stakes, sophisticated ${interviewType} interview questions designed to identify top 1% talent.

TARGET JOB BLUEPRINT:
${JSON.stringify({
        jobTitle: jobApplication.jobTitle,
        companyName: jobApplication.companyName,
        mission: jobApplication.jobDescription,
        context: jobApplication.companyIntelligence
      }, null, 2)}

REQUIRED OUTPUT FORMAT (STRICT PURE JSON):
{
  "questions": ["8-12 high-caliber, situational or technical questions"],
  "suggestedAnswers": [
    {
      "question": "The specific question text",
      "keyPoints": ["Critical signal to look for", "Required technical detail"],
      "sampleAnswer": "Elite-level response utilizing the STAR+Impact method"
    }
  ]
}

CRITICAL RULES:
- Use PLAIN TEXT ONLY. NO markdown bold (**), italics (*), or other symbols.
- Questions must be challenging and context-specific.
- Return ONLY the JSON object.
`;

      const result = await geminiService.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      if (!result) {
        throw new Error('AI service not available');
      }
      const text = result?.text || '';

      return JSON.parse(text);
    } catch (error) {
      console.error('Interview questions generation error:', error);
      return this.getFallbackInterviewQuestions(interviewType);
    }
  }

  async calculateApplicationScore(
    userProfile: IUserProfile,
    jobApplication: IJobApplication
  ): Promise<number> {
    try {
      const jobMatch = await this.analyzeJobMatch(userProfile, jobApplication);
      
      // Weighted scoring algorithm
      const weights = {
        skillsMatch: 0.35,
        experienceMatch: 0.25,
        locationMatch: 0.15,
        salaryMatch: 0.10,
        atsCompatibility: 0.15
      };

      const calculatedScore = Math.round(
        jobMatch.skillsMatch * weights.skillsMatch +
        jobMatch.experienceMatch * weights.experienceMatch +
        jobMatch.locationMatch * weights.locationMatch +
        jobMatch.salaryMatch * weights.salaryMatch +
        jobMatch.atsCompatibility * weights.atsCompatibility
      );
      
      console.log(`📊 Application score calculation:`, {
        skillsMatch: jobMatch.skillsMatch,
        experienceMatch: jobMatch.experienceMatch,
        locationMatch: jobMatch.locationMatch,
        salaryMatch: jobMatch.salaryMatch,
        atsCompatibility: jobMatch.atsCompatibility,
        weights,
        calculatedScore
      });
      
      return calculatedScore;
    } catch (error) {
      console.error('🚨 Application score calculation failed, falling back to direct Gemini service');
      throw error; // Don't use fallback - force proper error handling
    }
  }

  async optimizeBasicSummary(
    data: { skills: string[]; education: string; experience?: any[] }
  ): Promise<{ summary: string }> {
    try {
      const prompt = `
You are a Career Consultant specializing in entry-level and school-leaver resumes for the South African market. Write a professional, humble, and hardworking profile summary (max 3-4 sentences) for a candidate with the following details:

EDUCATION: ${data.education}
SKILLS: ${data.skills.join(', ')}
EXPERIENCE: ${data.experience?.length ? JSON.stringify(data.experience) : 'No formal work experience (focus on potential, character, and willingness to learn)'}

TONE: Professional, eager to work, reliable, honest.
OUTPUT FORMAT (STRICT JSON):
{
  "summary": "The profile summary text..."
}
`;

      const result = await geminiService.client?.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      
      if (!result) throw new Error('AI service unavailable');
      
      let text = result.text || '';
      // Clean markdown if present
      if (text.startsWith('```json')) text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      
      return JSON.parse(text);
    } catch (error) {
      console.error('Basic summary optimization failed:', error);
      return { 
        summary: `Hardworking and reliable ${data.education} graduate with strong skills in ${data.skills.slice(0,3).join(', ')}. Eager to learn and contribute to a professional team.` 
      };
    }
  }

  // Fallback methods for when AI services are unavailable
  private getFallbackOptimizationSuggestions(jobDescription: string): ResumeOptimizationSuggestion[] {
    return [
      {
        section: 'summary',
        priority: 'high',
        suggestion: 'Add a professional summary that highlights your key qualifications',
        reasoning: 'A strong summary helps ATS systems and recruiters quickly understand your value',
        keywords: ['professional', 'experienced', 'results-driven'],
        impact: 'improve_ats'
      },
      {
        section: 'skills',
        priority: 'high',
        suggestion: 'Include more technical keywords from the job description',
        reasoning: 'ATS systems scan for specific keywords to match candidates',
        keywords: ['technical skills', 'programming', 'tools'],
        impact: 'increase_match'
      }
    ];
  }

  private getFallbackJobMatchAnalysis(): JobMatchAnalysis {
    // Generate randomized fallback values to avoid static 78% score
    const baseScore = 60 + Math.floor(Math.random() * 30); // 60-90 range
    const variance = 20; // ±20 variance
    
    const randomizeScore = (base: number) => {
      const min = Math.max(15, base - variance);
      const max = Math.min(95, base + variance);
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    
    return {
      overallMatch: baseScore,
      skillsMatch: randomizeScore(baseScore),
      experienceMatch: randomizeScore(baseScore),
      locationMatch: randomizeScore(baseScore + 10), // slightly higher for location
      salaryMatch: randomizeScore(baseScore - 5), // slightly lower for salary
      missingSkills: ['AI analysis unavailable - using fallback'],
      strongPoints: ['Analysis requires working AI service'],
      recommendations: ['Enable AI service for detailed analysis'],
      atsCompatibility: randomizeScore(baseScore),
      competitiveAdvantage: ['Detailed analysis unavailable']
    };
  }

  private getFallbackCareerInsights(userProfile: IUserProfile): CareerInsight[] {
    return userProfile.preferredRoles.map(role => ({
      trend: 'stable' as const,
      demandLevel: 'medium' as const,
      averageSalary: 80000,
      skillsInDemand: ['communication', 'problem-solving'],
      careerProgression: ['Senior level', 'Management'],
      industryOutlook: 'Stable growth expected',
      recommendedCertifications: ['Industry-standard certifications']
    }));
  }

  private getFallbackInterviewQuestions(type: string): {
    questions: string[];
    suggestedAnswers: { question: string; keyPoints: string[]; sampleAnswer: string; }[];
  } {
    const commonQuestions = {
      behavioral: [
        'Tell me about yourself',
        'Describe a challenging situation you overcame',
        'How do you handle conflict in the workplace?',
        'Give an example of when you showed leadership',
        'Describe a time you failed and what you learned'
      ],
      technical: [
        'Explain your experience with [relevant technology]',
        'How would you approach [technical challenge]?',
        'What are the pros and cons of [technical concept]?',
        'Describe your development process',
        'How do you stay updated with industry trends?'
      ],
      general: [
        'Why are you interested in this position?',
        'What are your career goals?',
        'Why are you leaving your current job?',
        'What are your salary expectations?',
        'Do you have any questions for us?'
      ]
    };

    return {
      questions: commonQuestions[type as keyof typeof commonQuestions] || commonQuestions.general,
      suggestedAnswers: [
        {
          question: 'Tell me about yourself',
          keyPoints: ['Professional background', 'Key achievements', 'Career goals'],
          sampleAnswer: 'Use the STAR method to structure your response with specific examples and quantifiable results.'
        }
      ]
    };
  }
}

export const aiOptimizationService = new AIOptimizationService();