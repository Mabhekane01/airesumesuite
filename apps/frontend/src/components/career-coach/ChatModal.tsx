import { useState, useEffect, useRef } from 'react';
import { XMarkIcon, PaperAirplaneIcon, SparklesIcon, BriefcaseIcon, AcademicCapIcon, ChartBarIcon, CpuChipIcon, BoltIcon, CommandLineIcon, ChevronRightIcon, UserIcon } from '@heroicons/react/24/solid';
import { useCareerCoachStore } from '../../stores/careerCoachStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { motion, AnimatePresence } from 'framer-motion';

const COACHING_SUGGESTIONS = [
  {
    icon: <BriefcaseIcon className="w-4 h-4" />,
    text: "Analyze critical issues in my current architecture.",
    category: "Architecture Review"
  },
  {
    icon: <ChartBarIcon className="w-4 h-4" />,
    text: "Map skill delta for Tier-1 engineering roles.",
    category: "Market Alignment"
  },
  {
    icon: <SparklesIcon className="w-4 h-4" />,
    text: "Optimize semantic patterns for ATS validation.",
    category: "System Optimization"
  },
  {
    icon: <AcademicCapIcon className="w-4 h-4" />,
    text: "Quantify technical impact with precision.",
    category: "Data Calibration"
  }
];

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeTitle?: string;
}

export default function ChatModal({ isOpen, onClose, resumeTitle }: ChatModalProps) {
  const { messages, sendMessage, isLoading, error, selectedResume, clearError } = useCareerCoachStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedResume) return;

    await sendMessage(input, selectedResume._id!);
    setInput('');
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleClose = () => {
    setInput('');
    clearError();
    onClose();
  };

  const showSuggestions = messages.length === 0 && !isLoading;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 lg:pl-72 lg:pt-20">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="absolute inset-0 bg-brand-dark/40 backdrop-blur-md"
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative bg-white border border-surface-200 rounded-[2.5rem] md:rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] w-full max-w-5xl h-[85vh] md:h-[80vh] flex flex-col overflow-hidden"
      >
        {/* Header - Terminal Style */}
        <div className="px-6 py-5 md:px-10 md:py-8 border-b border-surface-100 flex items-center justify-between bg-white/80 backdrop-blur-xl relative z-20">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-brand-blue/20 rounded-2xl blur-lg animate-pulse" />
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-[1.5rem] bg-brand-dark flex items-center justify-center text-brand-blue relative z-10 shadow-xl border border-brand-blue/20">
                <CpuChipIcon className="w-7 h-7 md:w-9 md:h-9" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl md:text-3xl font-black text-brand-dark tracking-tighter leading-none">Career Terminal.</h2>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-success/10 text-brand-success border border-brand-success/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-success animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Neural Link Active</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CommandLineIcon className="w-3.5 h-3.5 text-text-tertiary" />
                <p className="text-[10px] md:text-xs font-bold text-text-tertiary uppercase tracking-[0.2em] truncate max-w-[200px] md:max-w-none">
                  {resumeTitle ? `Context: ${resumeTitle}` : 'Global Intelligence Protocol'}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="group p-3 md:p-4 text-text-tertiary hover:text-brand-dark hover:bg-surface-50 rounded-2xl md:rounded-[1.5rem] transition-all relative"
          >
            <XMarkIcon className="w-6 h-6 md:w-8 md:h-8" />
            <div className="absolute inset-0 rounded-full border border-surface-200 scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col p-4 md:p-10 overflow-hidden bg-[#FDFDFE] relative">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
          
          <div className="flex-1 overflow-y-auto space-y-6 md:space-y-10 pr-2 md:pr-4 custom-scrollbar relative z-10">
            {/* System Greeting */}
            {showSuggestions && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-3xl mx-auto w-full space-y-8 py-4"
              >
                <div className="bg-white border border-surface-200 p-6 md:p-10 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                    <SparklesIcon className="w-32 h-32" />
                  </div>
                  
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-inner">
                      <BoltIcon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-brand-dark tracking-tight">System Initialized.</h3>
                  </div>
                  
                  <p className="text-sm md:text-base font-bold text-text-secondary leading-relaxed mb-10 opacity-80">
                    Your professional DNA has been mapped. I am ready to identify high-leverage optimizations 
                    for your career trajectory. Which sector shall we calibrate first?
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {COACHING_SUGGESTIONS.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestionClick(s.text)}
                        className="p-5 md:p-6 bg-surface-50 border border-surface-100 rounded-[1.5rem] text-left hover:border-brand-blue hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-4 text-brand-blue/5 group-hover:text-brand-blue/10 transition-colors">
                          {s.icon}
                        </div>
                        <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest mb-2 opacity-60">{s.category}</p>
                        <p className="text-xs md:text-sm font-bold text-brand-dark leading-snug pr-4">{s.text}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Messages */}
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start gap-4 md:gap-6 ${msg.sender === 'user' ? 'flex-row-reverse' : ''} max-w-4xl ${msg.sender === 'user' ? 'ml-auto' : 'mr-auto'}`}
              >
                <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border-2 ${
                  msg.sender === 'ai' 
                    ? 'bg-brand-dark border-brand-blue/30 text-brand-blue' 
                    : 'bg-white border-brand-blue/10 text-brand-blue'
                }`}>
                  {msg.sender === 'ai' ? (
                    <SparklesIcon className="w-5 h-5 md:w-7 md:h-7" />
                  ) : (
                    <UserIcon className="w-5 h-5 md:w-7 md:h-7" />
                  )}
                </div>
                
                <div className={`group relative p-5 md:p-8 rounded-[1.8rem] md:rounded-[2.5rem] shadow-sm text-sm md:text-base font-bold leading-relaxed border transition-all ${
                  msg.sender === 'user' 
                    ? 'bg-brand-blue text-white border-brand-blue rounded-tr-none' 
                    : msg.error 
                    ? 'bg-red-50 text-red-600 border-red-100 rounded-tl-none' 
                    : 'bg-white text-text-primary border-surface-200 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] rounded-tl-none'
                }`}>
                  <div 
                    className={`prose prose-sm max-w-none ${msg.sender === 'user' ? 'prose-invert' : ''}`}
                    dangerouslySetInnerHTML={{ 
                      __html: msg.sender === 'ai' 
                        ? msg.text
                            .replace(/\n\n/g, '</div><div class="mt-4">')
                            .replace(/\n/g, '<br/>')
                        : msg.text 
                    }}
                  />
                  
                  {/* Message Timestamp/Status */}
                  <div className={`mt-4 pt-4 border-t opacity-40 flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] ${msg.sender === 'user' ? 'border-white/20' : 'border-surface-100'}`}>
                    <div className={`w-1 h-1 rounded-full ${msg.sender === 'user' ? 'bg-white' : 'bg-brand-blue'}`} />
                    {msg.sender === 'ai' ? 'Analytical Intelligence' : 'Authorized User'}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Loading State - Improved */}
            {isLoading && (
              <div className="flex items-start gap-4 md:gap-6 max-w-4xl mr-auto">
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-brand-dark flex items-center justify-center text-brand-blue shadow-lg border-2 border-brand-blue/30">
                  <SparklesIcon className="w-5 h-5 md:w-7 md:h-7 animate-pulse" />
                </div>
                <div className="bg-white border border-surface-200 p-6 md:p-8 rounded-[1.8rem] md:rounded-[2.5rem] rounded-tl-none shadow-sm flex flex-col gap-4 min-w-[200px]">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map(i => (
                        <motion.div 
                          key={i} 
                          animate={{ 
                            scale: [1, 1.5, 1],
                            opacity: [0.3, 1, 0.3]
                          }}
                          transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                          className="w-2 h-2 rounded-full bg-brand-blue shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-black text-brand-blue uppercase tracking-[0.2em]">Neural Processing...</span>
                  </div>
                  <div className="h-2 w-full bg-surface-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ x: "-100%" }}
                      animate={{ x: "100%" }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      className="h-full w-1/3 bg-gradient-to-r from-transparent via-brand-blue/40 to-transparent"
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Area - Enhanced */}
          <div className="mt-6 md:mt-10 pt-6 md:pt-10 border-t border-surface-100 relative z-20 bg-transparent">
            <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-4 md:gap-6 items-center">
              <div className="flex-1 relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-brand-blue/20 to-purple-500/20 rounded-[2rem] blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="absolute left-5 md:left-7 top-1/2 -translate-y-1/2 flex items-center gap-3 pointer-events-none">
                    <CommandLineIcon className="w-5 h-5 md:w-6 md:h-6 text-text-tertiary group-focus-within:text-brand-blue transition-colors" />
                    <div className="w-px h-6 bg-surface-200 group-focus-within:bg-brand-blue/30 transition-colors" />
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={selectedResume ? "Type command for career analysis..." : "Architecture required..."}
                    className="w-full bg-white border border-surface-200 rounded-[1.5rem] md:rounded-[2rem] py-4 md:py-7 pl-16 md:pl-20 pr-6 md:pr-8 text-sm md:text-base font-bold text-brand-dark focus:ring-0 focus:border-brand-blue outline-none transition-all placeholder:text-text-tertiary shadow-sm group-focus-within:shadow-xl"
                    disabled={isLoading || !selectedResume}
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={isLoading || !input.trim() || !selectedResume}
                className="w-14 h-14 md:w-20 md:h-20 rounded-[1.5rem] md:rounded-[2rem] bg-brand-dark text-brand-blue border-2 border-brand-blue/20 flex items-center justify-center shadow-2xl shadow-brand-blue/20 hover:scale-105 hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale overflow-hidden group/btn"
              >
                <div className="absolute inset-0 bg-brand-blue opacity-0 group-hover/btn:opacity-10 transition-opacity" />
                <PaperAirplaneIcon className="w-6 h-6 md:w-8 md:h-8 rotate-[-45deg] mb-1 mr-1 relative z-10 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
              </button>
            </form>
            
            <div className="mt-4 md:mt-6 flex flex-wrap justify-center gap-6 md:gap-10">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-success shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                <span className="text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-widest">End-to-End Encryption Enabled</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-blue shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                <span className="text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-widest">V4.0 Quantum Core Sync</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>

  );
}