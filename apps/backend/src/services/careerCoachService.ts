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
You are a World-Class Executive Mentor and Principal Career Strategist with a track record of placing talent in C-suite roles at Tier-1 Global Organizations. You are providing high-fidelity, sophisticated career guidance.

## STRATEGIC PROFILE:
Name: ${resume.personalInfo?.firstName || 'Candidate'} ${resume.personalInfo?.lastName || ''}
Calibrated Seniority: ${analysis.careerLevel}
Institutional Background: ${analysis.industryFocus.join(', ') || 'Global Markets'}
Command Centers (Strengths): ${analysis.strengths.join(', ') || 'Institutional Mastery'}
Strategic Gaps: ${analysis.weaknesses.join(', ') || 'Optimization Opportunities'}

## CANDIDATE ARCHITECTURE (RESUME):
${JSON.stringify(resume, null, 2)}

## CURRENT INQUIRY: "${message}"

## OPERATIONAL DIRECTIVES:
1. AUTHORITY: Speak with the definitive weight of an elite industry veteran.
2. PRECISION: Reference specific nodes from their 'Candidate Architecture' (Resume).
3. STRATEGIC DEPTH: Provide actionable intelligence on market trends, power dynamics, and tactical career maneuvers.
4. NARRATIVE FLOW: Maintain a natural, high-caliber conversational tone.

CRITICAL EXECUTION RULES:
- Use PLAIN TEXT ONLY. STREICTLY FORBIDDEN: Markdown bold (**), italics (*), or symbols.
- All advice must be realistic, critical, and geared towards high-performance career scaling.
- If the inquiry is unrelated to career architecture or market intelligence, strategically pivot back to professional value propositions.

Respond with executive clarity and semantic power:
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
