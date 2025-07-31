  async optimizeResumeWithJobUrl(resumeData: any, jobUrl: string): Promise<ResumeImprovementResult & { aiStatus?: string; jobScrapingSuccess?: boolean; scrapedJobDetails?: any }> {
    try {
      // Use the existing job optimization method from enterprise AI service
      const result = await enterpriseAIService.optimizeForJobPosting(resumeData, jobUrl);
      
      return {
        enhancedSummary: `Enhanced for ${result.jobDetails.title} at ${result.jobDetails.company}`,
        optimizedWorkExperience: resumeData.workExperience || [],
        optimizedEducation: resumeData.education || [],
        optimizedSkills: resumeData.skills || [],
        improvementsMade: result.recommendations || [],
        improvements: result.recommendations || [],
        success: true,
        aiStatus: 'Successfully optimized using AI',
        jobScrapingSuccess: true,
        scrapedJobDetails: result.jobDetails
      };
    } catch (error: any) {
      // Return fallback optimization
      return {
        enhancedSummary: resumeData.summary || 'Professional with relevant experience',
        optimizedWorkExperience: resumeData.workExperience || [],
        optimizedEducation: resumeData.education || [],
        optimizedSkills: resumeData.skills || [],
        improvementsMade: ['Resume optimization unavailable - please review job requirements manually'],
        improvements: ['AI optimization temporarily unavailable'],
        success: false,
        aiStatus: 'AI optimization failed, returned original resume',
        jobScrapingSuccess: false,
        scrapedJobDetails: null
      };
    }
  }

  async analyzeJobFromUrl(jobUrl: string): Promise<{
    jobDetails: any;
    matchAnalysis: any;
    recommendations: string[];
  }> {
    const jobDetails = await enterpriseAIService.analyzeJobFromUrl(jobUrl);
    
    return {
      jobDetails,
      matchAnalysis: {
        title: jobDetails.title,
        company: jobDetails.company,
        description: jobDetails.description,
        requirements: jobDetails.requirements
      },
      recommendations: [
        'Job posting successfully analyzed by AI',
        'Use the optimize function to align your resume with this job',
        'Review the job requirements and update your skills accordingly'
      ]
    };
  }