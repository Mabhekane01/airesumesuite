import { Resume } from '../models/Resume';
import { getGeminiStream } from '../services/ai/gemini';

// Helper function to convert MongoDB ObjectId to string
const convertObjectIdToString = (id: any): string => {
  if (!id) return '';
  
  if (typeof id === 'string') {
    return id;
  }
  
  // Handle MongoDB ObjectId Buffer format
  if (id.buffer && id.buffer.data && Array.isArray(id.buffer.data)) {
    const bytes = Array.from(id.buffer.data);
    return bytes.map(b => (b as number).toString(16).padStart(2, '0')).join('');
  }
  
  return String(id);
};

interface ResumeAnalysis {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  careerLevel: 'entry' | 'mid' | 'senior' | 'executive';
  industryFocus: string[];
}

const analyzeResume = (resume: any): ResumeAnalysis => {
  const workYears = resume.workExperience?.length || 0;
  const skillsCount = resume.skills?.length || 0;
  const educationLevel = resume.education?.[0]?.degree || '';
  const hasLeadershipExperience = resume.workExperience?.some((exp: any) => 
    exp.jobTitle.toLowerCase().includes('lead') || 
    exp.jobTitle.toLowerCase().includes('manager') || 
    exp.jobTitle.toLowerCase().includes('director')
  );

  const careerLevel = workYears === 0 ? 'entry' : 
                     workYears <= 3 ? 'mid' : 
                     (workYears > 8 || hasLeadershipExperience) ? 'senior' : 'mid';

  const industryFocus = resume.workExperience?.map((exp: any) => exp.company).slice(0, 3) || [];

  return {
    strengths: [
      skillsCount > 10 ? 'Strong technical skill set' : '',
      workYears > 3 ? 'Solid work experience' : '',
      hasLeadershipExperience ? 'Leadership experience' : '',
      educationLevel.includes('Master') || educationLevel.includes('PhD') ? 'Advanced education' : ''
    ].filter(Boolean),
    weaknesses: [
      skillsCount < 5 ? 'Limited skill diversity' : '',
      workYears < 2 ? 'Limited work experience' : '',
      !resume.certifications?.length ? 'No professional certifications' : '',
      !resume.projects?.length ? 'No notable projects showcased' : ''
    ].filter(Boolean),
    recommendations: [
      'Add quantified achievements to work experience',
      'Include relevant keywords for ATS optimization',
      'Consider professional certifications in your field'
    ],
    careerLevel,
    industryFocus
  };
};

const buildCoachingPrompt = (message: string, resume: any, analysis: ResumeAnalysis): string => {
  return `
You are an expert AI Career Coach and mentor with 15+ years of experience helping professionals succeed. You're having a natural conversation with someone about their career, and you have access to their resume to provide personalized, insightful guidance.

## About This Professional:
**Name**: ${resume.personalInfo?.firstName || 'This professional'} ${resume.personalInfo?.lastName || ''}
**Current Level**: ${analysis.careerLevel} level
**Industry Background**: ${analysis.industryFocus.join(', ') || 'Various industries'}
**Key Strengths**: ${analysis.strengths.join(', ') || 'Developing professional skills'}
**Growth Areas**: ${analysis.weaknesses.join(', ') || 'Continuing to build experience'}

## Their Resume Details:
${JSON.stringify(resume, null, 2)}

## Their Question/Message: "${message}"

## How to Respond:
- **Be Conversational**: Respond naturally like a friendly, expert mentor would in person
- **Be Personal**: Use their name when appropriate and reference specific details from their resume
- **Be Helpful**: Answer ANY question they ask, whether it's about career, resume, interviews, salary, industry trends, or general professional advice
- **Be Supportive**: Maintain an encouraging, positive tone while being honest and realistic
- **Be Specific**: When giving advice, reference their actual experience, skills, and background
- **Be Flexible**: They might ask about anything career-related, not just resume optimization

Remember: This is a real conversation. They might ask about:
- Resume improvement and optimization
- Career transitions or next steps
- Interview preparation and strategies
- Salary negotiation and market rates
- Skill development recommendations
- Industry insights and trends
- Work-life balance questions
- Networking and professional relationships
- Job search strategies
- Professional development opportunities
- Or any other career-related topic

Always provide thoughtful, personalized advice based on their background and current situation. If they ask something unrelated to their career, gently redirect them back to professional topics while still being helpful.

Respond in a natural, conversational way:
`;
};

const getAIResponse = async (message: string, resumeId: string): Promise<NodeJS.ReadableStream> => {
  // Convert ObjectId to string if needed
  const stringResumeId = convertObjectIdToString(resumeId);
  
  console.log('🔍 Career coach looking for resume:', {
    originalResumeId: resumeId,
    convertedResumeId: stringResumeId,
    resumeIdType: typeof resumeId
  });
  
  const resume = await Resume.findById(stringResumeId);
  if (!resume) {
    throw new Error('Resume not found');
  }

  const resumeData = resume.toObject();
  const analysis = analyzeResume(resumeData);
  const prompt = buildCoachingPrompt(message, resumeData, analysis);

  const stream = await getGeminiStream(prompt);
  return stream;
};

export const careerCoachService = {
  getAIResponse,
};
