import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SubscriptionGate from '../subscription/SubscriptionGate';
import {
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  LightBulbIcon,
  PencilSquareIcon,
  EyeIcon,
  ArrowPathIcon,
  MicrophoneIcon,
  StopIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { coverLetterService } from '../../services/coverLetterService';
import { resumeService, ResumeData as ResumeServiceData } from '../../services/resumeService';
import { toast } from 'sonner';

interface ConversationMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary';
  }>;
}

interface CoverLetterData {
  title: string;
  content: string;
  jobTitle: string;
  companyName: string;
  jobUrl?: string;
  jobDescription?: string;
  tone: 'professional' | 'casual' | 'enthusiastic' | 'conservative';
  resumeId?: string;
  matchScore?: number;
  improvements?: string[];
}

// Use the ResumeData from resumeService
type ResumeData = ResumeServiceData;

type ConversationStep = 'welcome' | 'job-input' | 'resume-selection' | 'generation' | 'review' | 'editing' | 'finalization';

export default function ConversationalCoverLetterBuilder() {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentStep, setCurrentStep] = useState<ConversationStep>('welcome');
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [coverLetterData, setCoverLetterData] = useState<CoverLetterData>({
    title: '',
    content: '',
    jobTitle: '',
    companyName: '',
    tone: 'professional'
  });
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>([]);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [realTimeAnalysis, setRealTimeAnalysis] = useState<any>(null);

  useEffect(() => {
    initializeConversation();
    fetchResumes();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (coverLetterData.content && coverLetterData.jobDescription) {
      performRealTimeAnalysis();
    }
  }, [coverLetterData.content]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchResumes = async () => {
    try {
      const resumeList = await resumeService.getUserResumes();
      setResumes(resumeList);
    } catch (error) {
      console.error('Failed to fetch resumes:', error);
    }
  };

  const initializeConversation = () => {
    const welcomeMessage: ConversationMessage = {
      id: '1',
      type: 'ai',
      content: "Hello! I'm your AI Cover Letter Assistant. I'll help you create a compelling, personalized cover letter through a conversational process. Let's start by telling me about the job you're applying for.",
      timestamp: new Date(),
      suggestions: [
        "I'm applying for a Software Engineer position",
        "I found a job posting I'd like to apply for",
        "I need help writing a cover letter"
      ]
    };
    setMessages([welcomeMessage]);
  };

  const addMessage = (message: Omit<ConversationMessage, 'id' | 'timestamp'>) => {
    const newMessage: ConversationMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const simulateTyping = async (duration: number = 1500) => {
    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, duration));
    setIsTyping(false);
  };

  const handleUserInput = async (input: string) => {
    if (!input.trim()) return;

    // Add user message
    addMessage({
      type: 'user',
      content: input
    });

    setUserInput('');
    await simulateTyping();

    // Process based on current step
    await processConversation(input);
  };

  const processConversation = async (input: string) => {
    switch (currentStep) {
      case 'welcome':
        await handleJobInputStep(input);
        break;
      case 'job-input':
        await handleJobDetailsInput(input);
        break;
      case 'resume-selection':
        await handleResumeSelection(input);
        break;
      case 'generation':
        await handleGenerationFeedback(input);
        break;
      case 'review':
        await handleReviewFeedback(input);
        break;
      case 'editing':
        await handleEditingInput(input);
        break;
      default:
        await handleGeneralInput(input);
    }
  };

  const handleJobInputStep = async (input: string) => {
    // Extract job information from user input
    const jobTitleMatch = input.match(/(?:applying for|position|role)\s+(?:a |an |the )?([\w\s]+)(?:at|position|role)/i);
    const companyMatch = input.match(/at\s+([\w\s]+)/i);
    
    if (jobTitleMatch) {
      setCoverLetterData(prev => ({ ...prev, jobTitle: jobTitleMatch[1].trim() }));
    }
    
    if (companyMatch) {
      setCoverLetterData(prev => ({ ...prev, companyName: companyMatch[1].trim() }));
    }

    let responseContent = "Great! I can see you're interested in ";
    if (jobTitleMatch && companyMatch) {
      responseContent += `the ${jobTitleMatch[1]} position at ${companyMatch[1]}. `;
    } else if (jobTitleMatch) {
      responseContent += `a ${jobTitleMatch[1]} position. What company is this for? `;
    } else {
      responseContent += "applying for a position. Could you tell me more about the specific job title and company? ";
    }

    responseContent += "Do you have a job posting URL I can analyze, or would you prefer to provide the details manually?";

    addMessage({
      type: 'ai',
      content: responseContent,
      suggestions: [
        "I have a job posting URL",
        "I'll provide the details manually",
        "Let me paste the job description"
      ],
      actions: [
        {
          label: "Analyze Job URL",
          action: () => setCurrentStep('job-input'),
          variant: 'primary'
        }
      ]
    });
    
    setCurrentStep('job-input');
  };

  const handleJobDetailsInput = async (input: string) => {
    if (input.toLowerCase().includes('url') || input.includes('http')) {
      // Handle job URL
      const urlMatch = input.match(/(https?:\/\/[^\s]+)/i);
      if (urlMatch) {
        await handleJobUrlAnalysis(urlMatch[1]);
        return;
      }
    }

    // Handle manual job details
    if (input.toLowerCase().includes('manual') || input.toLowerCase().includes('details')) {
      addMessage({
        type: 'ai',
        content: "Perfect! Let's collect the job details step by step. What's the job title?",
        suggestions: [
          "Software Engineer",
          "Product Manager",
          "Data Scientist",
          "Marketing Specialist"
        ]
      });
      return;
    }

    // If user provides job title directly
    if (!coverLetterData.jobTitle) {
      setCoverLetterData(prev => ({ ...prev, jobTitle: input }));
      addMessage({
        type: 'ai',
        content: `Excellent! Now, what's the company name for this ${input} position?`,
        suggestions: ["Google", "Microsoft", "Apple", "Amazon"]
      });
      return;
    }

    // If user provides company name
    if (!coverLetterData.companyName) {
      setCoverLetterData(prev => ({ ...prev, companyName: input }));
      await proceedToResumeSelection();
      return;
    }
  };

  const handleJobUrlAnalysis = async (jobUrl: string) => {
    setIsGenerating(true);
    addMessage({
      type: 'ai',
      content: "Analyzing the job posting... This will just take a moment."
    });

    try {
      const jobData = await coverLetterService.scrapeJobPosting(jobUrl);
      setCoverLetterData(prev => ({
        ...prev,
        jobTitle: jobData.title,
        companyName: jobData.company,
        jobUrl: jobUrl,
        jobDescription: jobData.description
      }));

      addMessage({
        type: 'ai',
        content: `Perfect! I've analyzed the ${jobData.title} position at ${jobData.company}. Here's what I found:\n\n📍 Location: ${jobData.location}\n💼 Role: ${jobData.title}\n🏢 Company: ${jobData.company}\n\nI can see the key requirements and responsibilities. Now let's select a resume to match against this position.`,
        actions: [
          {
            label: "View Full Analysis",
            action: () => showJobAnalysis(jobData)
          }
        ]
      });

      await proceedToResumeSelection();
    } catch (error) {
      addMessage({
        type: 'ai',
        content: "I couldn't analyze that job URL. Could you either try a different URL or provide the job details manually?",
        suggestions: [
          "Let me try a different URL",
          "I'll provide details manually"
        ]
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const proceedToResumeSelection = async () => {
    if (resumes.length === 0) {
      addMessage({
        type: 'ai',
        content: "I notice you don't have any resumes uploaded yet. You can still create a great cover letter, but having a resume would help me personalize it better. Would you like to continue without a resume or upload one first?",
        suggestions: [
          "Continue without resume",
          "Upload a resume first"
        ],
        actions: [
          {
            label: "Generate Cover Letter",
            action: () => startGeneration(),
            variant: 'primary'
          }
        ]
      });
    } else {
      const resumeList = resumes.map(r => `• ${r.title}`).join('\n');
      addMessage({
        type: 'ai',
        content: `Great! I found ${resumes.length} resume(s) in your account:\n\n${resumeList}\n\nWhich resume would you like me to use as the foundation for your cover letter?`,
        suggestions: resumes.slice(0, 3).map(r => r.title)
      });
    }
    setCurrentStep('resume-selection');
  };

  const handleResumeSelection = async (input: string) => {
    if (input.toLowerCase().includes('continue without') || input.toLowerCase().includes('no resume')) {
      await startGeneration();
      return;
    }

    // Find matching resume
    const selectedResume = resumes.find(r => 
      r.title.toLowerCase().includes(input.toLowerCase()) ||
      input.toLowerCase().includes(r.title.toLowerCase())
    );

    if (selectedResume) {
      setCoverLetterData(prev => ({ ...prev, resumeId: selectedResume._id }));
      addMessage({
        type: 'ai',
        content: `Perfect! I'll use "${selectedResume.title}" as the foundation. Now, what tone would you like for your cover letter?`,
        suggestions: [
          "Professional and formal",
          "Enthusiastic and passionate",
          "Casual and conversational",
          "Conservative and traditional"
        ]
      });
    } else {
      addMessage({
        type: 'ai',
        content: "I couldn't find that resume. Could you choose from the available options or tell me the exact title?",
        suggestions: resumes.slice(0, 3).map(r => r.title)
      });
    }
  };

  const startGeneration = async () => {
    setCurrentStep('generation');
    setIsGenerating(true);
    
    addMessage({
      type: 'ai',
      content: "Excellent! Now I'm going to create your personalized cover letter. This involves several AI processes:\n\n🔍 Analyzing job requirements\n📝 Matching your experience\n✨ Crafting compelling content\n🎯 Optimizing for keywords\n\nThis will take about 30-45 seconds..."
    });

    try {
      // Generate variations for better options
      if (coverLetterData.resumeId && coverLetterData.jobDescription) {
        const variations = await coverLetterService.generateCoverLetterVariations({
          resumeId: coverLetterData.resumeId,
          jobDescription: coverLetterData.jobDescription,
          jobTitle: coverLetterData.jobTitle,
          companyName: coverLetterData.companyName
        });

        if (variations.length > 0) {
          setCoverLetterData(prev => ({
            ...prev,
            content: variations[0].content,
            tone: variations[0].tone as any
          }));

          addMessage({
            type: 'ai',
            content: `🎉 Your cover letter is ready! I've created a ${variations[0].tone} version optimized for the ${coverLetterData.jobTitle} position.\n\nKey strengths I've highlighted:\n${variations[0].strengths.map(s => `• ${s}`).join('\n')}\n\nWould you like to review it, make any adjustments, or try a different tone?`,
            actions: [
              {
                label: "Review Cover Letter",
                action: () => setCurrentStep('review'),
                variant: 'primary'
              },
              {
                label: "Try Different Tone",
                action: () => showToneOptions()
              }
            ]
          });
          
          setCurrentStep('review');
        }
      } else {
        // Fallback to basic generation
        await generateBasicCover();
      }
    } catch (error) {
      addMessage({
        type: 'ai',
        content: "I encountered an issue generating your cover letter. Let me try a different approach or we can build it step by step.",
        suggestions: [
          "Try again",
          "Build it manually",
          "Start over"
        ]
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateBasicCover = async () => {
    const basicContent = await coverLetterService.generateAIContent({
      jobTitle: coverLetterData.jobTitle,
      companyName: coverLetterData.companyName,
      tone: coverLetterData.tone,
      resumeId: coverLetterData.resumeId,
      jobDescription: coverLetterData.jobDescription
    });

    if (basicContent.success && basicContent.content) {
      setCoverLetterData(prev => ({ ...prev, content: basicContent.content! }));
      addMessage({
        type: 'ai',
        content: "Your cover letter is ready! I've created a personalized version based on the information you provided. Would you like to review and refine it?",
        actions: [
          {
            label: "Review Cover Letter",
            action: () => setCurrentStep('review'),
            variant: 'primary'
          }
        ]
      });
      setCurrentStep('review');
    }
  };

  const performRealTimeAnalysis = async () => {
    if (!coverLetterData.content || !coverLetterData.jobDescription) return;

    try {
      // Create a temporary cover letter for analysis
      const analysis = await coverLetterService.analyzeCoverLetterMatch('temp', coverLetterData.jobDescription);
      setRealTimeAnalysis(analysis);
      
      // Provide real-time suggestions
      if (analysis.matchScore < 70) {
        setCurrentSuggestions(analysis.improvementSuggestions.slice(0, 2));
      }
    } catch (error) {
      console.error('Real-time analysis failed:', error);
    }
  };

  const handleReviewFeedback = async (input: string) => {
    if (input.toLowerCase().includes('looks good') || input.toLowerCase().includes('approve')) {
      await proceedToFinalization();
    } else if (input.toLowerCase().includes('edit') || input.toLowerCase().includes('change')) {
      setCurrentStep('editing');
      addMessage({
        type: 'ai',
        content: "What would you like to change? I can help you:\n\n• Adjust the tone or style\n• Add specific achievements\n• Emphasize certain skills\n• Modify particular sections\n• Optimize for keywords\n\nJust tell me what you'd like to improve!",
        suggestions: [
          "Make it more enthusiastic",
          "Add more technical details",
          "Emphasize leadership experience",
          "Make it more concise"
        ]
      });
    } else {
      // Handle specific feedback
      await handleEditingInput(input);
    }
  };

  const handleEditingInput = async (input: string) => {
    setIsGenerating(true);
    
    try {
      // Use AI to enhance based on user feedback
      const enhanced = await coverLetterService.enhanceCoverLetterWithAI({
        content: coverLetterData.content,
        jobDescription: coverLetterData.jobDescription,
        tone: coverLetterData.tone,
        focusAreas: [input]
      });

      setCoverLetterData(prev => ({ ...prev, content: enhanced.enhancedContent }));
      
      addMessage({
        type: 'ai',
        content: `I've updated your cover letter based on your feedback: "${input}".\n\nImprovements made:\n${enhanced.improvements.map(i => `• ${i}`).join('\n')}\n\nHow does it look now?`,
        actions: [
          {
            label: "Looks Great!",
            action: () => proceedToFinalization()
          },
          {
            label: "More Changes",
            action: () => setCurrentStep('editing')
          }
        ]
      });
    } catch (error) {
      addMessage({
        type: 'ai',
        content: "I had trouble making that change. Could you be more specific about what you'd like me to adjust?"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const proceedToFinalization = async () => {
    setCurrentStep('finalization');
    
    addMessage({
      type: 'ai',
      content: "🎉 Perfect! Your cover letter is ready. Here are your options:\n\n📄 Save to your dashboard\n📥 Download as PDF/DOCX\n📋 Copy to clipboard\n📧 Email to yourself\n\nWhat would you like to do?",
      actions: [
        {
          label: "Download PDF",
          action: () => downloadCoverLetter('pdf'),
          variant: 'primary'
        },
        {
          label: "Save to Dashboard",
          action: () => saveCoverLetter()
        },
        {
          label: "Copy to Clipboard",
          action: () => copyToClipboard()
        }
      ]
    });
  };

  const handleGeneralInput = async (input: string) => {
    // Handle general conversation and questions
    addMessage({
      type: 'ai',
      content: "I can help you with that! Is this related to improving your current cover letter, or would you like to start a new one?",
      suggestions: [
        "Improve current cover letter",
        "Start a new cover letter",
        "Ask a question"
      ]
    });
  };

  const handleGenerationFeedback = async (input: string) => {
    // Handle feedback during generation
    if (input.toLowerCase().includes('stop') || input.toLowerCase().includes('cancel')) {
      setIsGenerating(false);
      addMessage({
        type: 'ai',
        content: "Generation stopped. Would you like to try a different approach?"
      });
    }
  };

  const showJobAnalysis = (jobData: any) => {
    addMessage({
      type: 'system',
      content: `📊 **Job Analysis Results**\n\n**Position:** ${jobData.title}\n**Company:** ${jobData.company}\n**Location:** ${jobData.location}\n\n**Key Requirements:** ${jobData.requirements?.slice(0, 3).join(', ') || 'Analysis in progress...'}\n\n**Responsibilities:** ${jobData.responsibilities?.slice(0, 3).join(', ') || 'Analysis in progress...'}`
    });
  };

  const showToneOptions = () => {
    addMessage({
      type: 'ai',
      content: "What tone would you prefer for your cover letter?",
      suggestions: [
        "Professional and formal",
        "Enthusiastic and passionate",
        "Casual and conversational",
        "Conservative and traditional"
      ]
    });
  };

  const downloadCoverLetter = async (format: 'pdf' | 'docx' | 'txt') => {
    try {
      // Use the enterprise download functionality
      const response = await fetch(`/api/cover-letters/download-with-data/${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ coverLetterData })
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${coverLetterData.title || 'Cover_Letter'}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Cover letter downloaded as ${format.toUpperCase()}!`);
      
      addMessage({
        type: 'ai',
        content: `📥 Your cover letter has been downloaded as a ${format.toUpperCase()} file! Anything else I can help you with?`
      });
    } catch (error) {
      toast.error('Download failed. Please try again.');
      addMessage({
        type: 'ai',
        content: "Sorry, there was an issue downloading your cover letter. Would you like to try a different format or save it to your dashboard instead?"
      });
    }
  };

  const saveCoverLetter = async () => {
    try {
      const result = await coverLetterService.createCoverLetter({
        title: coverLetterData.title || `Cover Letter - ${coverLetterData.jobTitle} at ${coverLetterData.companyName}`,
        jobTitle: coverLetterData.jobTitle,
        companyName: coverLetterData.companyName,
        jobUrl: coverLetterData.jobUrl,
        jobDescription: coverLetterData.jobDescription,
        tone: coverLetterData.tone,
        resumeId: coverLetterData.resumeId
      });

      if (result.success && result.data) {
        toast.success('Cover letter saved to dashboard!');
        addMessage({
          type: 'ai',
          content: "✅ Your cover letter has been saved to your dashboard! You can access it anytime and make further edits if needed.",
          actions: [
            {
              label: "View in Dashboard",
              action: () => navigate(`/dashboard/cover-letters/${result.data!._id}`)
            }
          ]
        });
      }
    } catch (error) {
      toast.error('Failed to save cover letter');
      addMessage({
        type: 'ai',
        content: "I had trouble saving your cover letter. Would you like to try downloading it instead?"
      });
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(coverLetterData.content);
      toast.success('Copied to clipboard!');
      addMessage({
        type: 'ai',
        content: "📋 Your cover letter has been copied to your clipboard! You can now paste it anywhere you need it."
      });
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const startVoiceInput = () => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setUserInput(transcript);
      };
      
      recognition.onerror = () => {
        setIsListening(false);
        toast.error('Voice recognition failed');
      };
      
      recognition.start();
    } else {
      toast.error('Voice recognition not supported in this browser');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setUserInput(suggestion);
    handleUserInput(suggestion);
  };

  return (
    <SubscriptionGate 
      feature="AI Cover Letter Generator" 
      description="Create personalized, professional cover letters through AI-powered conversation. Get tailored content, tone suggestions, and optimization for any job application."
      requiresEnterprise={true}
      showUpgrade={true}
    >
      <div className="min-h-screen bg-gradient-dark">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold gradient-text-dark mb-4 flex items-center justify-center">
            <ChatBubbleLeftRightIcon className="w-10 h-10 mr-3 text-accent-primary" />
            AI Cover Letter Assistant
          </h1>
          <p className="text-dark-text-secondary text-lg">
            Let's create your perfect cover letter through conversation
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <Card className="card-dark h-[600px] flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.type === 'user'
                          ? 'bg-accent-primary text-white'
                          : message.type === 'system'
                          ? 'bg-accent-tertiary/20 border border-accent-tertiary/30 text-accent-tertiary'
                          : 'bg-gray-800 text-dark-text-primary'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      
                      {/* Suggestions */}
                      {message.suggestions && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.suggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="px-3 py-1 text-sm bg-dark-accent/10 hover:bg-dark-accent/20 rounded-full border border-dark-border transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {/* Actions */}
                      {message.actions && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.actions.map((action, idx) => (
                            <Button
                              key={idx}
                              onClick={action.action}
                              variant={action.variant || 'secondary'}
                              size="sm"
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Real-time Suggestions */}
              {currentSuggestions.length > 0 && (
                <div className="px-6 py-2 border-t border-dark-border">
                  <div className="flex items-center text-sm text-accent-secondary mb-2">
                    <LightBulbIcon className="w-4 h-4 mr-1" />
                    AI Suggestions:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleUserInput(`Please ${suggestion.toLowerCase()}`)}
                        className="px-2 py-1 text-xs bg-accent-secondary/10 hover:bg-accent-secondary/20 rounded text-accent-secondary border border-accent-secondary/30 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="p-6 border-t border-dark-border">
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <Input
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleUserInput(userInput)}
                      placeholder="Type your message here..."
                      disabled={isGenerating}
                    />
                  </div>
                  <Button
                    onClick={() => handleUserInput(userInput)}
                    disabled={!userInput.trim() || isGenerating}
                    className="px-4"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={isListening ? () => setIsListening(false) : startVoiceInput}
                    variant="outline"
                    className={`px-4 ${isListening ? 'bg-red-500 text-white' : ''}`}
                  >
                    {isListening ? <StopIcon className="w-4 h-4" /> : <MicrophoneIcon className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Progress */}
            <Card className="card-dark p-6">
              <h3 className="text-lg font-semibold text-dark-text-primary mb-4 flex items-center">
                <DocumentTextIcon className="w-5 h-5 mr-2 text-accent-primary" />
                Progress
              </h3>
              <div className="space-y-3">
                {[
                  { step: 'welcome', label: 'Getting Started', completed: currentStep !== 'welcome' },
                  { step: 'job-input', label: 'Job Details', completed: ['resume-selection', 'generation', 'review', 'editing', 'finalization'].includes(currentStep) },
                  { step: 'resume-selection', label: 'Resume Selection', completed: ['generation', 'review', 'editing', 'finalization'].includes(currentStep) },
                  { step: 'generation', label: 'AI Generation', completed: ['review', 'editing', 'finalization'].includes(currentStep) },
                  { step: 'review', label: 'Review & Edit', completed: ['finalization'].includes(currentStep) },
                  { step: 'finalization', label: 'Download & Save', completed: false }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      item.completed ? 'bg-green-500' : 
                      item.step === currentStep ? 'bg-accent-primary' : 'bg-dark-border'
                    }`}>
                      {item.completed && <CheckCircleIcon className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-sm ${
                      item.step === currentStep ? 'text-accent-primary font-medium' :
                      item.completed ? 'text-green-400' : 'text-dark-text-muted'
                    }`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Current Job Info */}
            {(coverLetterData.jobTitle || coverLetterData.companyName) && (
              <Card className="card-dark p-6">
                <h3 className="text-lg font-semibold text-dark-text-primary mb-4 flex items-center">
                  <MagnifyingGlassIcon className="w-5 h-5 mr-2 text-accent-tertiary" />
                  Current Job
                </h3>
                <div className="space-y-2 text-sm">
                  {coverLetterData.jobTitle && (
                    <div>
                      <span className="text-dark-text-muted">Position:</span>
                      <div className="text-dark-text-primary font-medium">{coverLetterData.jobTitle}</div>
                    </div>
                  )}
                  {coverLetterData.companyName && (
                    <div>
                      <span className="text-dark-text-muted">Company:</span>
                      <div className="text-dark-text-primary font-medium">{coverLetterData.companyName}</div>
                    </div>
                  )}
                  {coverLetterData.tone && (
                    <div>
                      <span className="text-dark-text-muted">Tone:</span>
                      <div className="text-dark-text-primary font-medium capitalize">{coverLetterData.tone}</div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Real-time Analysis */}
            {realTimeAnalysis && (
              <Card className="card-dark p-6">
                <h3 className="text-lg font-semibold text-dark-text-primary mb-4 flex items-center">
                  <BeakerIcon className="w-5 h-5 mr-2 text-accent-secondary" />
                  Live Analysis
                </h3>
                <div className="space-y-3">
                  <div className="text-center">
                    <div className={`text-3xl font-bold mb-1 ${
                      realTimeAnalysis.matchScore >= 80 ? 'text-green-400' :
                      realTimeAnalysis.matchScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {realTimeAnalysis.matchScore}%
                    </div>
                    <div className="text-sm text-dark-text-muted">Match Score</div>
                  </div>
                  
                  {realTimeAnalysis.keywordAlignment?.length > 0 && (
                    <div>
                      <div className="text-sm text-dark-text-muted mb-2">Keywords Found:</div>
                      <div className="flex flex-wrap gap-1">
                        {realTimeAnalysis.keywordAlignment.slice(0, 6).map((keyword: string, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-accent-secondary/20 text-accent-secondary rounded-full text-xs">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="card-dark p-6">
              <h3 className="text-lg font-semibold text-dark-text-primary mb-4 flex items-center">
                <AdjustmentsHorizontalIcon className="w-5 h-5 mr-2 text-accent-tertiary" />
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Button
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  variant="outline"
                  size="sm"
                  className="w-full btn-secondary-dark"
                >
                  <AdjustmentsHorizontalIcon className="w-4 h-4 mr-2" />
                  Advanced Options
                </Button>
                
                {coverLetterData.content && (
                  <>
                    <Button
                      onClick={() => copyToClipboard()}
                      variant="outline"
                      size="sm"
                      className="w-full btn-secondary-dark"
                    >
                      <ClipboardDocumentIcon className="w-4 h-4 mr-2" />
                      Copy to Clipboard
                    </Button>
                    
                    <Button
                      onClick={() => downloadCoverLetter('pdf')}
                      variant="outline"
                      size="sm"
                      className="w-full btn-secondary-dark"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Cover Letter Preview Modal */}
        {coverLetterData.content && currentStep === 'review' && (
          <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
            <Card className="card-dark max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-dark-text-primary">Cover Letter Preview</h2>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => setCurrentStep('editing')}
                      variant="outline"
                      size="sm"
                    >
                      <PencilSquareIcon className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => proceedToFinalization()}
                      variant="primary"
                      size="sm"
                    >
                      <CheckCircleIcon className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </div>
                
                <div className="bg-white text-black p-8 rounded-lg">
                  <div className="whitespace-pre-wrap font-serif leading-relaxed">
                    {coverLetterData.content}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
      </div>
    </SubscriptionGate>
  );
}