
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
As an expert ATS and recruitment specialist, analyze this resume against the job description and provide specific optimization suggestions.

USER PROFILE:
${JSON.stringify({
          headline: (userProfile as any).headline,
          bio: (userProfile as any).bio,
          technicalSkills: (userProfile as any).technicalSkills,
          preferredRoles: (userProfile as any).preferredRoles,
          aiOptimizationPreferences: (userProfile as any).aiOptimizationPreferences
        }, null, 2)}

JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME:
${resumeContent}

Provide detailed optimization suggestions in JSON format with this structure:
{
  "suggestions": [
    {
      "section": "experience|skills|summary|education|projects",
      "priority": "high|medium|low",
      "suggestion": "specific actionable suggestion",
      "reasoning": "detailed explanation of why this change helps",
      "keywords": ["keyword1", "keyword2"],
      "impact": "increase_match|improve_ats|enhance_readability|boost_ranking"
    }
  ]
}

Focus on:
1. ATS keyword optimization
2. Skill alignment with job requirements
3. Quantifiable achievements
4. Industry-specific terminology
5. Format and structure improvements

Respond with ONLY the JSON object, no markdown or additional text.
`;

        // Add timeout wrapper
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AI request timeout')), 45000);
        });

        const aiPromise = geminiService.client?.models.generateContent({
          model: 'gemini-2.5-flash',
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
Analyze how well this candidate matches the job requirements and provide a comprehensive match analysis.

CANDIDATE PROFILE:
${JSON.stringify({
          headline: (userProfile as any).headline,
          bio: (userProfile as any).bio,
          yearsOfExperience: userProfile.yearsOfExperience,
          technicalSkills: userProfile.technicalSkills,
          softSkills: (userProfile as any).softSkills,
          preferredRoles: userProfile.preferredRoles,
          currentLocation: (userProfile as any).currentLocation,
          expectedSalary: (userProfile as any).expectedSalary
        }, null, 2)}

JOB DETAILS:
${JSON.stringify({
          jobTitle: jobApplication.jobTitle,
          companyName: jobApplication.companyName,
          jobDescription: jobApplication.jobDescription,
          jobLocation: jobApplication.jobLocation,
          compensation: jobApplication.compensation
        }, null, 2)}

Provide analysis in JSON format:
{
  "overallMatch": 85,
  "skillsMatch": 90,
  "experienceMatch": 80,
  "locationMatch": 95,
  "salaryMatch": 75,
  "missingSkills": ["skill1", "skill2"],
  "strongPoints": ["point1", "point2"],
  "recommendations": ["rec1", "rec2"],
  "atsCompatibility": 88,
  "competitiveAdvantage": ["advantage1", "advantage2"]
}

Calculate scores out of 100 and provide actionable insights.
Respond with ONLY the JSON object, no markdown or additional text.
`;

        // Add timeout wrapper
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AI request timeout')), 45000);
        });

        const aiPromise = geminiService.client?.models.generateContent({
          model: 'gemini-2.5-flash',
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
Provide career insights and market analysis for this professional profile.

PROFILE:
${JSON.stringify({
        headline: (userProfile as any).headline,
        yearsOfExperience: userProfile.yearsOfExperience,
        technicalSkills: userProfile.technicalSkills,
        preferredRoles: userProfile.preferredRoles,
        preferredIndustries: (userProfile as any).preferredIndustries,
        currentLocation: (userProfile as any).currentLocation
      }, null, 2)}

Generate insights for each preferred role in JSON format:
{
  "insights": [
    {
      "role": "Software Engineer",
      "trend": "growing|stable|declining",
      "demandLevel": "high|medium|low",
      "averageSalary": 120000,
      "skillsInDemand": ["React", "Python", "AWS"],
      "careerProgression": ["Senior Engineer", "Tech Lead", "Engineering Manager"],
      "industryOutlook": "detailed outlook",
      "recommendedCertifications": ["AWS Solutions Architect", "PMP"]
    }
  ]
}

Base recommendations on current market trends, salary data, and skill demand.
`;

      const result = await geminiService.client?.models.generateContent({
        model: 'gemini-2.5-flash',
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

  async optimizeCoverLetter(
    userProfile: IUserProfile,
    jobApplication: IJobApplication,
    template?: string
  ): Promise<string> {
    try {
      const prompt = `
Generate a compelling, personalized cover letter for this job application.

CANDIDATE:
${JSON.stringify({
        headline: (userProfile as any).headline,
        bio: (userProfile as any).bio,
        technicalSkills: userProfile.technicalSkills.slice(0, 8),
        aiOptimizationPreferences: (userProfile as any).aiOptimizationPreferences
      }, null, 2)}

JOB:
${JSON.stringify({
        jobTitle: jobApplication.jobTitle,
        companyName: jobApplication.companyName,
        jobDescription: jobApplication.jobDescription,
        companyIntelligence: jobApplication.companyIntelligence,
        applicationStrategy: jobApplication.applicationStrategy
      }, null, 2)}

TEMPLATE (if provided): ${template || 'Use professional standard format'}

Requirements:
- Tone: ${(userProfile as any).aiOptimizationPreferences.tonePreference}
- Length: 250-400 words
- Include specific achievements and metrics
- Address company's needs and values
- Show genuine interest and research
- Include call to action

Generate a compelling cover letter that stands out while being ATS-friendly.
`;

      const result = await geminiService.client?.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      if (!result) {
        throw new Error('AI service not available');
      }
      return result?.text?.trim() || this.getFallbackCoverLetter(userProfile, jobApplication);
    } catch (error) {
      console.error('Cover letter optimization error:', error);
      return this.getFallbackCoverLetter(userProfile, jobApplication);
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
Generate ${interviewType} interview questions and preparation guidance for this job.

JOB:
${JSON.stringify({
        jobTitle: jobApplication.jobTitle,
        companyName: jobApplication.companyName,
        jobDescription: jobApplication.jobDescription,
        companyIntelligence: jobApplication.companyIntelligence
      }, null, 2)}

INTERVIEW TYPE: ${interviewType}

Provide response in JSON format:
{
  "questions": ["question1", "question2", ...],
  "suggestedAnswers": [
    {
      "question": "Tell me about yourself",
      "keyPoints": ["point1", "point2", "point3"],
      "sampleAnswer": "detailed STAR method answer"
    }
  ]
}

Generate 8-12 relevant questions and 5 detailed answer guides.
`;

      const result = await geminiService.client?.models.generateContent({
        model: 'gemini-2.5-flash',
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

  private getFallbackCoverLetter(userProfile: IUserProfile, jobApplication: IJobApplication): string {
    return `Dear Hiring Manager,

I am writing to express my strong interest in the ${jobApplication.jobTitle} position at ${jobApplication.companyName}. With ${userProfile.yearsOfExperience} years of experience and expertise in ${userProfile.technicalSkills.slice(0, 3).map(s => s.name).join(', ')}, I am confident I would be a valuable addition to your team.

${(userProfile as any).bio}

I am particularly excited about this opportunity because it aligns perfectly with my career goals and expertise. I would welcome the chance to discuss how my background and skills can contribute to ${jobApplication.companyName}'s continued success.

Thank you for your consideration.

Sincerely,
[Your Name]`;
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