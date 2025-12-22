import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  SparklesIcon, 
  DocumentTextIcon, 
  EyeIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  LightBulbIcon,
  ArrowDownTrayIcon,
  BeakerIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { coverLetterService } from '../../services/coverLetterService';
import { resumeService } from '../../services/resumeService';
import { toast } from 'sonner';

interface CoverLetterData {
  _id?: string;
  title: string;
  content: string;
  jobTitle: string;
  companyName: string;
  jobUrl?: string;
  jobDescription?: string;
  tone: 'professional' | 'casual' | 'enthusiastic' | 'conservative';
  resumeId?: string;
  matchScore?: number;
  keywordAlignment?: string[];
  strengths?: string[];
}

interface ResumeData {
  _id: string;
  title: string;
  personalInfo: any;
  professionalSummary: string;
  workExperience: any[];
  education: any[];
  skills: any[];
}

interface CoverLetterVariation {
  tone: string;
  content: string;
  strengths: string[];
}

export default function IntelligentCoverLetterBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract resume data from navigation state or URL params
  const resumeData = location.state?.resumeData as ResumeData;
  const jobUrl = location.state?.jobUrl || '';
  const jobDescription = location.state?.jobDescription || '';
  
  const [currentStep, setCurrentStep] = useState<'input' | 'generate' | 'preview' | 'customize'>('input');
  const [coverLetterData, setCoverLetterData] = useState<CoverLetterData>({
    title: '',
    content: '',
    jobTitle: '',
    companyName: '',
    jobUrl: jobUrl,
    jobDescription: jobDescription,
    tone: 'professional',
    resumeId: resumeData?._id || ''
  });
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showVariations, setShowVariations] = useState(false);
  const [variations, setVariations] = useState<CoverLetterVariation[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<number>(0);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [activeTab, setActiveTab] = useState<'write' | 'preview' | 'analysis' | 'export'>('write');

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const resumeList = await resumeService.getUserResumes();
      setResumes(resumeList);
      
      // Auto-select the passed resume or the first available
      if (resumeData) {
        setCoverLetterData(prev => ({ ...prev, resumeId: resumeData._id }));
      } else if (resumeList.length > 0) {
        setCoverLetterData(prev => ({ ...prev, resumeId: resumeList[0]._id }));
      }
    } catch (error) {
      console.error('Failed to fetch resumes:', error);
      toast.error('Failed to load resumes');
    }
  };

  const handleJobUrlScrape = async () => {
    if (!coverLetterData.jobUrl) return;
    
    setIsGenerating(true);
    try {
      const jobData = await coverLetterService.scrapeJobPosting(coverLetterData.jobUrl);
      setCoverLetterData(prev => ({
        ...prev,
        jobTitle: jobData.title,
        companyName: jobData.company,
        jobDescription: jobData.description,
        title: `Cover Letter - ${jobData.title} at ${jobData.company}`
      }));
      toast.success('Job posting analyzed successfully!');
    } catch (error) {
      toast.error('Failed to analyze job posting. Please check the URL.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCoverLetter = async () => {
    if (!coverLetterData.resumeId || !coverLetterData.jobDescription || !coverLetterData.jobTitle || !coverLetterData.companyName) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsGenerating(true);
    setCurrentStep('generate');
    
    try {
      // Generate multiple variations
      toast.loading('🤖 Creating intelligent cover letter variations...', { id: 'generate' });
      
      const response = await fetch('/api/cover-letters/generate-variations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: coverLetterData.resumeId,
          jobDescription: coverLetterData.jobDescription,
          jobTitle: coverLetterData.jobTitle,
          companyName: coverLetterData.companyName,
          customInstructions
        })
      });

      if (!response.ok) throw new Error('Failed to generate variations');
      
      const variationsData = await response.json();
      setVariations(variationsData.data);
      
      // Set the first variation as default
      if (variationsData.data.length > 0) {
        setCoverLetterData(prev => ({
          ...prev,
          content: variationsData.data[0].content,
          tone: variationsData.data[0].tone as any
        }));
      }
      
      toast.success('✨ Cover letter variations generated!', { id: 'generate' });
      setCurrentStep('preview');
      setActiveTab('preview');
      
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error('Failed to generate cover letter. Please try again.', { id: 'generate' });
      setCurrentStep('input');
    } finally {
      setIsGenerating(false);
    }
  };

  const analyzeCoverLetter = async () => {
    if (!coverLetterData.content || !coverLetterData.jobDescription) {
      toast.error('Cover letter content and job description required for analysis');
      return;
    }

    setIsAnalyzing(true);
    try {
      toast.loading('📊 Analyzing cover letter match...', { id: 'analysis' });
      
      // Create a temporary cover letter for analysis
      const tempCoverLetter = await coverLetterService.createCoverLetter({
        title: 'Analysis Temp',
        jobTitle: coverLetterData.jobTitle,
        companyName: coverLetterData.companyName,
        jobDescription: coverLetterData.jobDescription,
        tone: coverLetterData.tone,
        resumeId: coverLetterData.resumeId
      });

      const analysis = await fetch(`/api/cover-letters/${tempCoverLetter._id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: coverLetterData.jobDescription })
      });

      if (!analysis.ok) throw new Error('Analysis failed');
      
      const result = await analysis.json();
      setAnalysisResult(result.data);
      setCoverLetterData(prev => ({
        ...prev,
        matchScore: result.data.matchScore,
        keywordAlignment: result.data.keywordAlignment,
        strengths: result.data.strengths
      }));
      
      // Clean up temp cover letter
      await coverLetterService.deleteCoverLetter(tempCoverLetter._id);
      
      toast.success(`📈 Analysis complete! Match score: ${result.data.matchScore}%`, { id: 'analysis' });
      setShowAnalysis(true);
      setActiveTab('analysis');
      
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error('Failed to analyze cover letter', { id: 'analysis' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const optimizeForATS = async () => {
    if (!coverLetterData.content) return;
    
    setIsGenerating(true);
    try {
      toast.loading('🛡️ Optimizing for ATS compatibility...', { id: 'ats-optimize' });
      
      const optimizedContent = await fetch('/api/cover-letters/optimize-ats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: coverLetterData.content,
          jobDescription: coverLetterData.jobDescription,
          optimizationLevel: 'comprehensive'
        })
      });

      if (!optimizedContent.ok) throw new Error('Optimization failed');
      
      const result = await optimizedContent.json();
      setCoverLetterData(prev => ({ ...prev, content: result.data.content }));
      
      toast.success('✅ ATS optimization complete!', { id: 'ats-optimize' });
      
    } catch (error) {
      toast.error('Failed to optimize for ATS', { id: 'ats-optimize' });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveCoverLetter = async () => {
    try {
      const savedCoverLetter = await coverLetterService.createCoverLetter({
        title: coverLetterData.title || `Cover Letter - ${coverLetterData.jobTitle} at ${coverLetterData.companyName}`,
        jobTitle: coverLetterData.jobTitle,
        companyName: coverLetterData.companyName,
        jobUrl: coverLetterData.jobUrl,
        jobDescription: coverLetterData.jobDescription,
        tone: coverLetterData.tone,
        resumeId: coverLetterData.resumeId
      });
      
      toast.success('Cover letter saved successfully!');
      navigate(`/dashboard/cover-letters/${savedCoverLetter._id}`);
    } catch (error) {
      toast.error('Failed to save cover letter');
    }
  };

  const renderInputStep = () => (
    <div className="space-y-6">
      {/* Resume Selection */}
      <Card className="card-dark p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center">
          <DocumentTextIcon className="w-5 h-5 mr-2 text-teal-400" />
          Resume Integration
        </h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <Select
            label="Select Resume for Context"
            value={coverLetterData.resumeId}
            onChange={(e) => setCoverLetterData(prev => ({ ...prev, resumeId: e.target.value }))}
            required
          >
            <option value="">Choose a resume...</option>
            {resumes.map((resume) => (
              <option key={resume._id} value={resume._id}>
                {resume.title}
              </option>
            ))}
          </Select>

          {resumeData && (
            <div className="p-4 bg-teal-500/10 border border-teal-400/30 rounded-lg">
              <div className="flex items-center mb-2">
                <CheckCircleIcon className="w-5 h-5 text-teal-400 mr-2" />
                <span className="font-medium text-teal-400">Resume Loaded</span>
              </div>
              <p className="text-sm text-teal-300">{resumeData.title}</p>
              <p className="text-xs text-teal-300/70">{resumeData.personalInfo?.firstName} {resumeData.personalInfo?.lastName}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Job Information */}
      <Card className="card-dark p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center">
          <MagnifyingGlassIcon className="w-5 h-5 mr-2 text-green-400" />
          Job Information
        </h3>
        
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Input
              label="Job Posting URL (Optional)"
              value={coverLetterData.jobUrl}
              onChange={(e) => setCoverLetterData(prev => ({ ...prev, jobUrl: e.target.value }))}
              placeholder="https://linkedin.com/jobs/view/..."
              className="flex-1"
            />
            <div className="pt-6">
              <Button
                onClick={handleJobUrlScrape}
                variant="outline"
                disabled={!coverLetterData.jobUrl || isGenerating}
                className="btn-secondary-dark"
              >
                {isGenerating ? 'Analyzing...' : 'Analyze'}
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Job Title"
              value={coverLetterData.jobTitle}
              onChange={(e) => setCoverLetterData(prev => ({ ...prev, jobTitle: e.target.value }))}
              placeholder="Senior Software Engineer"
              required
            />
            <Input
              label="Company Name"
              value={coverLetterData.companyName}
              onChange={(e) => setCoverLetterData(prev => ({ ...prev, companyName: e.target.value }))}
              placeholder="Tech Corp Inc."
              required
            />
          </div>

          <Textarea
            label="Job Description"
            value={coverLetterData.jobDescription}
            onChange={(e) => setCoverLetterData(prev => ({ ...prev, jobDescription: e.target.value }))}
            placeholder="Paste the complete job description here for AI optimization..."
            rows={8}
            required
          />

          <div className="grid md:grid-cols-2 gap-4">
            <Select
              label="Tone"
              value={coverLetterData.tone}
              onChange={(e) => setCoverLetterData(prev => ({ ...prev, tone: e.target.value as any }))}
            >
              <option value="professional">Professional & Formal</option>
              <option value="enthusiastic">Enthusiastic & Passionate</option>
              <option value="conservative">Conservative & Traditional</option>
              <option value="casual">Casual & Conversational</option>
            </Select>

            <Input
              label="Cover Letter Title"
              value={coverLetterData.title}
              onChange={(e) => setCoverLetterData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Auto-generated from job details"
            />
          </div>

          <Textarea
            label="Custom Instructions (Optional)"
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="Any specific points you want to highlight or requirements..."
            rows={3}
          />
        </div>
      </Card>

      {/* Generation Tips */}
      <Card className="card-dark p-6 bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 border border-emerald-500/30">
        <div className="flex items-start space-x-3">
          <SparklesIcon className="w-6 h-6 text-emerald-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-emerald-400 mb-2">AI Enhancement Features</h3>
            <ul className="text-sm text-emerald-300 space-y-1">
              <li>• Intelligent resume-job matching with keyword optimization</li>
              <li>• Multiple tone variations to match company culture</li>
              <li>• ATS compatibility analysis and optimization</li>
              <li>• Real-time content scoring and improvement suggestions</li>
              <li>• Industry-specific language and terminology</li>
            </ul>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={generateCoverLetter}
          disabled={!coverLetterData.resumeId || !coverLetterData.jobDescription || !coverLetterData.jobTitle}
          className="btn-primary-dark px-8"
        >
          <SparklesIcon className="w-4 h-4 mr-2" />
          Generate AI Cover Letter
        </Button>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-surface-50/20 p-1 rounded-lg border border-surface-200">
        {[
          { id: 'write', label: 'Edit', icon: PencilSquareIcon },
          { id: 'preview', label: 'Preview', icon: EyeIcon },
          { id: 'analysis', label: 'Analysis', icon: ChartBarIcon },
          { id: 'export', label: 'Export', icon: ArrowDownTrayIcon }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 px-3 rounded-md font-medium transition-colors flex items-center justify-center ${
              activeTab === tab.id
                ? 'bg-dark-accent text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Based on Active Tab */}
      {activeTab === 'write' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Variations Panel */}
          <div className="lg:col-span-1">
            <Card className="card-dark p-4 sticky top-8">
              <h4 className="font-semibold text-text-primary mb-4 flex items-center">
                <BeakerIcon className="w-5 h-5 mr-2 text-emerald-400" />
                AI Variations
              </h4>
              
              <div className="space-y-3">
                {variations.map((variation, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedVariation(index);
                      setCoverLetterData(prev => ({ ...prev, content: variation.content, tone: variation.tone as any }));
                    }}
                    className={`w-full p-3 text-left rounded-lg border transition-colors ${
                      selectedVariation === index
                        ? 'border-emerald-400 bg-emerald-500/10'
                        : 'border-surface-200 hover:border-emerald-400/50'
                    }`}
                  >
                    <div className="font-medium text-sm mb-1 capitalize">{variation.tone} Tone</div>
                    <div className="text-xs text-dark-text-muted mb-2">
                      {variation.content.split(' ').length} words
                    </div>
                    <div className="space-y-1">
                      {variation.strengths.slice(0, 2).map((strength, idx) => (
                        <div key={idx} className="flex items-center text-xs">
                          <CheckCircleIcon className="w-3 h-3 text-green-400 mr-1" />
                          <span className="text-green-400">{strength}</span>
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-surface-200">
                <Button
                  onClick={optimizeForATS}
                  variant="outline"
                  size="sm"
                  className="w-full btn-secondary-dark"
                  disabled={isGenerating}
                >
                  <ShieldCheckIcon className="w-4 h-4 mr-2" />
                  {isGenerating ? 'Optimizing...' : 'ATS Optimize'}
                </Button>
              </div>
            </Card>
          </div>

          {/* Editor Panel */}
          <div className="lg:col-span-2">
            <Card className="card-dark p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-text-primary">Cover Letter Content</h4>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-dark-text-muted">
                    {coverLetterData.content.split(' ').length} words
                  </span>
                  {coverLetterData.matchScore && (
                    <div className="flex items-center">
                      <ChartBarIcon className="w-4 h-4 text-green-400 mr-1" />
                      <span className="text-sm font-medium text-green-400">
                        {coverLetterData.matchScore}% match
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <Textarea
                value={coverLetterData.content}
                onChange={(e) => setCoverLetterData(prev => ({ ...prev, content: e.target.value }))}
                rows={20}
                className="font-mono text-sm"
                placeholder="Your cover letter content will appear here..."
              />

              <div className="mt-4 flex justify-between">
                <Button
                  onClick={analyzeCoverLetter}
                  variant="outline"
                  disabled={isAnalyzing}
                  className="btn-secondary-dark"
                >
                  <ChartBarIcon className="w-4 h-4 mr-2" />
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Match'}
                </Button>

                <Button
                  onClick={() => setCurrentStep('input')}
                  variant="outline"
                  className="btn-secondary-dark"
                >
                  Edit Details
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'preview' && (
        <Card className="card-dark p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white text-black p-8 rounded-lg shadow-lg">
              <div className="whitespace-pre-wrap font-serif leading-relaxed">
                {coverLetterData.content || 'No content to preview'}
              </div>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'analysis' && analysisResult && (
        <div className="space-y-6">
          {/* Match Score */}
          <Card className="card-dark p-6 text-center">
            <div className={`text-6xl font-bold mb-4 ${
              analysisResult.matchScore >= 80 ? 'text-green-400' : 
              analysisResult.matchScore >= 60 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {analysisResult.matchScore}%
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">Job Match Score</h3>
            <p className="text-text-secondary">{analysisResult.overallAssessment}</p>
          </Card>

          {/* Detailed Analysis */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="card-dark p-6">
              <h4 className="font-semibold text-green-400 mb-4 flex items-center">
                <CheckCircleIcon className="w-5 h-5 mr-2" />
                Strengths ({analysisResult.strengths?.length || 0})
              </h4>
              <div className="space-y-2">
                {analysisResult.strengths?.map((strength: string, index: number) => (
                  <div key={index} className="flex items-start">
                    <CheckCircleIcon className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-text-secondary">{strength}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="card-dark p-6">
              <h4 className="font-semibold text-yellow-400 mb-4 flex items-center">
                <LightBulbIcon className="w-5 h-5 mr-2" />
                Improvement Suggestions
              </h4>
              <div className="space-y-2">
                {analysisResult.improvementSuggestions?.map((suggestion: string, index: number) => (
                  <div key={index} className="flex items-start">
                    <LightBulbIcon className="w-4 h-4 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-text-secondary">{suggestion}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Keywords */}
          <Card className="card-dark p-6">
            <h4 className="font-semibold text-teal-400 mb-4 flex items-center">
              <ClipboardDocumentListIcon className="w-5 h-5 mr-2" />
              Keyword Alignment ({analysisResult.keywordAlignment?.length || 0} matches)
            </h4>
            <div className="flex flex-wrap gap-2">
              {analysisResult.keywordAlignment?.map((keyword: string, index: number) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-teal-500/20 text-teal-400 rounded-full text-sm border border-teal-400/30"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'export' && (
        <Card className="card-dark p-6">
          <h4 className="font-semibold text-text-primary mb-4 flex items-center">
            <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
            Export & Save Options
          </h4>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h5 className="font-medium text-text-primary">Save to Dashboard</h5>
              <Button
                onClick={saveCoverLetter}
                className="w-full btn-primary-dark"
              >
                <DocumentTextIcon className="w-4 h-4 mr-2" />
                Save Cover Letter
              </Button>
            </div>
            
            <div className="space-y-4">
              <h5 className="font-medium text-text-primary">Download Formats</h5>
              <div className="space-y-2">
                <Button variant="outline" className="w-full btn-secondary-dark">
                  <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                  Download as PDF
                </Button>
                <Button variant="outline" className="w-full btn-secondary-dark">
                  <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                  Download as DOCX
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          onClick={() => setCurrentStep('input')}
          variant="outline"
          className="btn-secondary-dark"
        >
          ← Back to Edit
        </Button>
        
        <div className="flex space-x-3">
          <Button
            onClick={analyzeCoverLetter}
            variant="outline"
            disabled={isAnalyzing}
            className="btn-secondary-dark"
          >
            <ChartBarIcon className="w-4 h-4 mr-2" />
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </Button>
          
          <Button
            onClick={saveCoverLetter}
            className="btn-primary-dark"
          >
            <DocumentTextIcon className="w-4 h-4 mr-2" />
            Save Cover Letter
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen gradient-dark py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text-dark mb-2">
                Intelligent Cover Letter Builder
              </h1>
              <p className="text-text-secondary">
                AI-powered cover letter generation with resume integration and job matching
              </p>
            </div>
            
            {resumeData && (
              <div className="text-right">
                <div className="text-sm text-dark-text-muted">Using Resume:</div>
                <div className="font-medium text-text-primary">{resumeData.title}</div>
              </div>
            )}
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[
              { step: 'input', label: 'Input', icon: DocumentTextIcon },
              { step: 'generate', label: 'Generate', icon: SparklesIcon },
              { step: 'preview', label: 'Review', icon: EyeIcon }
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  currentStep === item.step ? 'bg-dark-accent text-white' :
                  ['input', 'generate', 'preview'].indexOf(currentStep) > index ? 'bg-green-500 text-white' :
                  'bg-surface-50 text-dark-text-muted'
                }`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="ml-2 text-sm font-medium text-text-primary">{item.label}</span>
                {index < 2 && <ArrowPathIcon className="w-4 h-4 mx-4 text-dark-text-muted" />}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        {currentStep === 'input' && renderInputStep()}
        {(currentStep === 'generate' || currentStep === 'preview') && renderPreviewStep()}

        {/* Loading State */}
        {isGenerating && currentStep === 'generate' && (
          <Card className="card-dark p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">Generating Your Cover Letter</h3>
            <p className="text-text-secondary">Our AI is analyzing your resume and the job requirements to create the perfect cover letter...</p>
          </Card>
        )}
      </div>
    </div>
  );
}
