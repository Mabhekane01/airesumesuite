import { useState, useEffect, useRef } from 'react';
import { XMarkIcon, PaperAirplaneIcon, SparklesIcon, BriefcaseIcon, AcademicCapIcon, ChartBarIcon, CpuChipIcon, BoltIcon, CommandLineIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="absolute inset-0 bg-brand-dark/20 backdrop-blur-md"
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white border border-surface-200 rounded-[2rem] md:rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] w-full max-w-4xl h-[90vh] md:h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 md:p-8 border-b border-surface-100 flex items-center justify-between bg-white relative z-10">
          <div className="flex items-center gap-3 md:gap-5">
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-inner">
              <CpuChipIcon className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5 md:mb-1">
                <h2 className="text-lg md:text-2xl font-black text-brand-dark tracking-tighter leading-none">AI Career Terminal.</h2>
                <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-brand-success/10 text-brand-success">
                  <div className="w-1 h-1 rounded-full bg-brand-success animate-pulse" />
                  <span className="text-[8px] font-black uppercase tracking-widest">Active</span>
                </div>
              </div>
              <p className="text-[10px] md:text-xs font-bold text-text-tertiary uppercase tracking-[0.15em] truncate max-w-[200px] md:max-w-none">
                {resumeTitle ? `Architecture: ${resumeTitle}` : 'Cognitive Deployment Engine'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 md:p-3 text-text-tertiary hover:text-brand-dark hover:bg-surface-50 rounded-xl md:rounded-2xl transition-all"
          >
            <XMarkIcon className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col p-4 md:p-8 overflow-hidden bg-surface-50/30 relative">
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
          
          <div className="flex-1 overflow-y-auto space-y-4 md:space-y-6 pr-1 md:pr-2 custom-scrollbar relative z-10">
            {/* System Greeting */}
            {showSuggestions && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl bg-white border border-surface-200 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm space-y-4 md:space-y-6"
              >
                <div className="flex items-center gap-3">
                  <BoltIcon className="w-4 h-4 md:w-5 md:h-5 text-brand-blue" />
                  <h3 className="text-base md:text-lg font-black text-brand-dark tracking-tight">Initialization Complete.</h3>
                </div>
                <p className="text-xs md:text-sm font-bold text-text-secondary leading-relaxed opacity-80">
                  I have parsed your professional architecture and synchronized with current market dynamics. How shall we optimize your trajectory?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 md:pt-2">
                  {COACHING_SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(s.text)}
                      className="p-3 md:p-4 bg-surface-50 border border-surface-200 rounded-xl md:rounded-2xl text-left hover:border-brand-blue/30 hover:bg-white transition-all group shadow-sm"
                    >
                      <div className="text-brand-blue mb-1 md:mb-2 opacity-60 group-hover:opacity-100 transition-opacity">{s.icon}</div>
                      <p className="text-[10px] md:text-xs font-black text-brand-dark leading-tight">{s.text}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Messages */}
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start gap-3 md:gap-4 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border ${msg.sender === 'ai' ? 'bg-brand-dark border-brand-dark text-brand-blue' : 'bg-white border-surface-200 text-brand-dark'}`}>
                  {msg.sender === 'ai' ? <SparklesIcon className="w-4 h-4 md:w-5 md:h-5" /> : <span className="text-[10px] font-black">YOU</span>}
                </div>
                <div className={`max-w-[85%] md:max-w-[80%] p-4 md:p-6 rounded-2xl md:rounded-[1.5rem] shadow-sm text-sm font-bold leading-relaxed border ${msg.sender === 'user' 
                    ? 'bg-brand-blue text-white border-brand-blue' 
                    : msg.error 
                    ? 'bg-red-50 text-red-600 border-red-100' 
                    : 'bg-white text-text-primary border-surface-200'}`}>
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: msg.sender === 'ai' ? msg.text.replace(/\n/g, '<br/>') : msg.text 
                    }}
                  />
                </div>
              </motion.div>
            ))}

            {/* Loading */}
            {isLoading && (
              <div className="flex items-start gap-3 md:gap-4">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-brand-dark flex items-center justify-center text-brand-blue shadow-sm">
                  <SparklesIcon className="w-4 h-4 md:w-5 md:h-5 animate-pulse" />
                </div>
                <div className="bg-white border border-surface-200 px-4 py-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl flex items-center gap-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.div 
                        key={i} 
                        animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                        className="w-1.5 h-1.5 rounded-full bg-brand-blue" 
                      />
                    ))}
                  </div>
                  <span className="text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-widest">Processing Delta</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Area */}
          <div className="mt-4 md:mt-8 pt-4 md:pt-8 border-t border-surface-100 relative z-10 bg-transparent">
            <form onSubmit={handleSendMessage} className="flex gap-3 md:gap-4 items-center">
              <div className="flex-1 relative group">
                <CommandLineIcon className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-text-tertiary group-focus-within:text-brand-blue transition-colors" />
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={selectedResume ? "Execute career query..." : "Initialize architecture first..."}
                  className="w-full bg-white border border-surface-200 rounded-xl md:rounded-[1.5rem] py-3.5 md:py-5 pl-12 md:pl-14 pr-4 md:pr-6 text-sm font-bold text-brand-dark focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue outline-none transition-all placeholder:text-text-tertiary shadow-sm"
                  disabled={isLoading || !selectedResume}
                />
              </div>
              <button 
                type="submit" 
                disabled={isLoading || !input.trim() || !selectedResume}
                className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-[1.5rem] bg-brand-blue text-white flex items-center justify-center shadow-xl shadow-brand-blue/20 hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
              >
                <PaperAirplaneIcon className="w-5 h-5 md:w-6 md:h-6 rotate-[-45deg] mb-0.5 mr-0.5" />
              </button>
            </form>
            
            <div className="mt-3 md:mt-4 flex flex-wrap justify-center gap-4 md:gap-6">
              <div className="flex items-center gap-1.5 md:gap-2">
                <div className="w-1 h-1 rounded-full bg-brand-success" />
                <span className="text-[8px] md:text-[9px] font-black text-text-tertiary uppercase tracking-widest">End-to-End Encrypted</span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <div className="w-1 h-1 rounded-full bg-brand-blue" />
                <span className="text-[8px] md:text-[9px] font-black text-text-tertiary uppercase tracking-widest">GPT-4 Optimized Core</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}