import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  DocumentTextIcon, 
  LinkIcon, 
  SparklesIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  MicrophoneIcon,
  ArrowDownTrayIcon,
  BeakerIcon,
  LightBulbIcon,
  ChartBarIcon,
  ArrowRightIcon,
  UserIcon,
  CommandLineIcon,
  RocketLaunchIcon,
  CpuChipIcon,
  ChevronRightIcon,
  GlobeAmericasIcon
} from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { useCoverLetterStore } from '../../stores/coverLetterStore';
import { useResumeStore } from '../../stores/resumeStore';
import { coverLetterService } from '../../services/coverLetterService';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const coverLetterSchema = z.object({
  method: z.enum(['manual', 'job-url', 'ai-chat']),
  title: z.string().min(1, 'Title is required'),
  jobTitle: z.string().optional(),
  companyName: z.string().optional(), 
  jobUrl: z.string().url('Valid URL required').optional().or(z.literal('')),
  jobDescription: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'enthusiastic', 'conservative']),
  resumeId: z.string().optional(),
});

type CoverLetterFormData = z.infer<typeof coverLetterSchema>;

export default function CoverLetterGenerator() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<'manual' | 'job-url' | 'ai-chat'>('manual');
  const [isScrapingJob, setIsScrapingJob] = useState(false);
  const [scrapedJobData, setScrapedJobData] = useState<any>(null);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{sender: 'user' | 'ai'; content: string; timestamp: string;}>>([]);

  const { createCoverLetter, loadingState } = useCoverLetterStore();
  const { resumes, fetchResumes } = useResumeStore();

  const form = useForm<CoverLetterFormData>({
    resolver: zodResolver(coverLetterSchema),
    defaultValues: {
      method: 'manual',
      title: '',
      jobTitle: '',
      companyName: '',
      jobUrl: '',
      jobDescription: '',
      tone: 'professional',
      resumeId: '',
    },
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue } = form;

  useEffect(() => { fetchResumes(); }, [fetchResumes]);

  const onSubmit = async (data: CoverLetterFormData) => {
    try {
      setIsGeneratingAI(true);
      const result = await coverLetterService.generateAIContent({
        jobTitle: data.jobTitle || '',
        companyName: data.companyName || '',
        tone: data.tone,
        resumeId: data.resumeId,
        jobDescription: data.jobDescription || '',
      });
      if (result.success) {
        setGeneratedContent(result.content);
        toast.success('Architecture Optimized. Narrative deployed.');
      }
    } catch (error) {
      toast.error('Synthesis failed.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="space-y-10 animate-slide-up-soft pb-20">
      {/* --- HEADER --- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
            <DocumentTextIcon className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Narrative Synthesis</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-brand-dark tracking-tighter">Cover Letter Factory.</h1>
          <p className="text-lg text-text-secondary font-bold opacity-70">Generate hyper-tailored professional correspondence.</p>
        </div>
      </div>

      {/* --- METHOD SELECTION --- */}
      <div className="bg-white border border-surface-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.15]" />
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-brand-dark tracking-tight mb-8">Synthesis Methodology.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { id: 'manual', label: 'Manual Entry', icon: CommandLineIcon, desc: 'Base technical parameters' },
              { id: 'job-url', label: 'Neural Scraping', icon: GlobeAmericasIcon, desc: 'Direct URL extraction' },
              { id: 'ai-chat', label: 'Cognitive Chat', icon: ChatBubbleLeftRightIcon, desc: 'Interactive personality sync' }
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => { setMethod(m.id as any); setValue('method', m.id as any); }}
                className={`p-6 rounded-[2rem] border-2 text-left transition-all duration-300 group ${
                  method === m.id ? 'bg-brand-blue border-brand-blue text-white shadow-xl' : 'bg-surface-50 border-surface-100 hover:border-brand-blue/30'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-all ${method === m.id ? 'bg-white text-brand-blue' : 'bg-white border border-surface-200 text-brand-blue shadow-sm'}`}>
                  <m.icon className="w-6 h-6" />
                </div>
                <p className="text-sm font-black uppercase tracking-widest mb-1">{m.label}</p>
                <p className={`text-[10px] font-bold ${method === m.id ? 'opacity-80' : 'text-text-tertiary'}`}>{m.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* --- PARAMETER PANEL --- */}
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-white border border-surface-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">
            <h3 className="text-xl font-black text-brand-dark tracking-tight mb-8 uppercase flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
              Core Parameters
            </h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Archive Title</label>
                <input {...register('title')} className="input-resume py-4" placeholder="Deployment Identifier" />
              </div>

              {method === 'job-url' ? (
                <div className="space-y-2 animate-slide-up-soft">
                  <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Source URL</label>
                  <input {...register('jobUrl')} className="input-resume py-4 border-brand-blue/30" placeholder="https://linkedin.com/jobs/..." />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 animate-slide-up-soft">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Target Role</label>
                    <input {...register('jobTitle')} className="input-resume py-4" placeholder="Principal Engineer" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Target Host</label>
                    <input {...register('companyName')} className="input-resume py-4" placeholder="Global Tech Inc." />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Active Architecture</label>
                  <select {...register('resumeId')} className="input-resume py-4 appearance-none bg-white cursor-pointer">
                    <option value="">Select Resume Node...</option>
                    {resumes.map(r => <option key={r._id} value={r._id}>{r.title}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Linguistic Tone</label>
                  <select {...register('tone')} className="input-resume py-4 appearance-none bg-white cursor-pointer">
                    <option value="professional">Professional Protocol</option>
                    <option value="enthusiastic">High-Yield / Growth</option>
                    <option value="casual">Direct / Modern</option>
                    <option value="conservative">Traditional Tier-1</option>
                  </select>
                </div>
              </div>

              {method === 'manual' && (
                <div className="space-y-2 pt-4 border-t border-surface-100">
                  <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Contextual Data</label>
                  <textarea {...register('jobDescription')} rows={6} className="input-resume py-4" placeholder="Paste architectural requirements for AI mapping..." />
                </div>
              )}
            </div>

            <div className="mt-10">
              <button 
                type="submit" 
                disabled={isGeneratingAI}
                className="btn-primary w-full py-5 text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isGeneratingAI ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : <CpuChipIcon className="w-5 h-5 stroke-[2.5]" />}
                Initialize Synthesis
              </button>
            </div>
          </div>
        </div>

        {/* --- OUTPUT PANEL --- */}
        <div className="lg:col-span-7 flex flex-col h-full">
          <div className="bg-white border border-surface-200 rounded-[3rem] shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="p-8 border-b border-surface-100 bg-surface-50/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white border border-surface-200 flex items-center justify-center text-brand-blue shadow-sm">
                  <BeakerIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-brand-dark tracking-tight leading-none mb-1">Synthesis Result.</h3>
                  <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Awaiting deployment command</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" className="p-3 bg-white border border-surface-200 rounded-xl text-text-tertiary hover:text-brand-blue transition-all shadow-sm">
                  <ArrowDownTrayIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-10 bg-surface-100/30 relative">
              <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />
              <textarea
                value={generatedContent}
                onChange={(e) => setGeneratedContent(e.target.value)}
                className="w-full h-full min-h-[500px] bg-white border-2 border-surface-200 rounded-[2rem] p-10 text-base font-bold text-brand-dark leading-relaxed shadow-inner outline-none focus:border-brand-blue/30 transition-all placeholder:text-text-tertiary placeholder:font-bold italic"
                placeholder="AI-generated architecture will be rendered here upon protocol execution..."
              />
            </div>

            <div className="p-8 border-t border-surface-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${generatedContent ? 'bg-brand-success shadow-[0_0_8px_rgba(46,204,113,0.5)]' : 'bg-surface-300'}`} />
                <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">
                  {generatedContent ? 'Output Ready' : 'System Standby'}
                </span>
              </div>
              <button 
                type="button"
                disabled={!generatedContent}
                className="btn-primary px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg disabled:opacity-30 disabled:grayscale"
              >
                Deploy to Archive
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}