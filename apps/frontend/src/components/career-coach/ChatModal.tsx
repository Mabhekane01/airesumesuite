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
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    if (!input.trim() || !selectedResume || isLoading) return;

    const messageToSend = input.trim();
    setInput('');
    // Auto-resize textarea back to normal
    if (inputRef.current) inputRef.current.style.height = 'auto';
    
    await sendMessage(messageToSend, selectedResume._id!);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="absolute inset-0 bg-brand-dark/20 backdrop-blur-sm"
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="relative bg-white w-full max-w-5xl h-full sm:h-[85vh] md:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between bg-white sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-dark flex items-center justify-center text-brand-blue shadow-sm">
              <CpuChipIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-brand-dark uppercase tracking-wider">Career Terminal</h2>
              {resumeTitle && <p className="text-[10px] font-bold text-text-tertiary truncate max-w-[200px] uppercase tracking-widest">{resumeTitle}</p>}
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-surface-50 text-text-tertiary transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
          <div className="max-w-3xl mx-auto w-full px-6 py-10 space-y-10">
            {showSuggestions && (
              <div className="flex flex-col items-center justify-center space-y-12 py-10">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-brand-dark flex items-center justify-center text-brand-blue mx-auto shadow-xl border border-brand-blue/10">
                    <SparklesIcon className="w-8 h-8" />
                  </div>
                  <h1 className="text-3xl font-black text-brand-dark tracking-tight">How can I help you today?</h1>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  {COACHING_SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(s.text)}
                      className="p-4 bg-white border border-surface-200 rounded-2xl text-left hover:bg-surface-50 transition-all group flex flex-col justify-between h-24"
                    >
                      <p className="text-xs font-bold text-brand-dark leading-snug">{s.text}</p>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">{s.category}</span>
                        <ChevronRightIcon className="w-3 h-3 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, index) => (
              <div key={index} className={`flex gap-4 md:gap-6 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-4 md:gap-6 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${
                    msg.sender === 'ai' 
                      ? 'bg-brand-dark text-brand-blue' 
                      : 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20'
                  }`}>
                    {msg.sender === 'ai' ? <SparklesIcon className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                  </div>
                  
                  <div className="space-y-2">
                    <div className={`text-sm md:text-base font-medium leading-relaxed ${msg.sender === 'user' ? 'bg-surface-50 p-4 rounded-2xl rounded-tr-none' : ''}`}>
                      <div 
                        className={`prose prose-sm max-w-none ${msg.sender === 'user' ? 'text-brand-dark' : 'text-text-primary'}`}
                        dangerouslySetInnerHTML={{ 
                          __html: msg.sender === 'ai' 
                            ? msg.text.replace(/\n/g, '<br/>')
                            : msg.text 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-4 md:gap-6 justify-start">
                <div className="w-8 h-8 rounded-lg bg-brand-dark text-brand-blue flex items-center justify-center flex-shrink-0 shadow-sm">
                  <SparklesIcon className="w-5 h-5 animate-pulse" />
                </div>
                <div className="flex gap-1 pt-3">
                  {[0, 1, 2].map(i => (
                    <motion.div 
                      key={i} 
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                      className="w-1.5 h-1.5 rounded-full bg-brand-blue" 
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="px-6 py-6 md:pb-10 bg-white border-t border-surface-50 sm:border-none">
          <div className="max-w-3xl mx-auto relative group">
            <form onSubmit={handleSendMessage} className="relative flex items-end bg-surface-50 border border-surface-200 rounded-[1.5rem] focus-within:border-brand-blue/30 transition-all shadow-sm">
              <textarea
                ref={inputRef as any}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder="Message Career Coach..."
                className="w-full bg-transparent py-4 pl-6 pr-14 text-sm md:text-base font-medium text-brand-dark outline-none resize-none max-h-40 custom-scrollbar"
              />
              <div className="absolute right-3 bottom-2.5">
                <button 
                  type="submit" 
                  disabled={isLoading || !input.trim() || !selectedResume}
                  className="w-10 h-10 rounded-xl bg-brand-dark text-brand-blue flex items-center justify-center shadow-lg transition-all active:scale-90 disabled:opacity-20 disabled:grayscale"
                >
                  <PaperAirplaneIcon className="w-5 h-5 rotate-[-45deg] mb-0.5 mr-0.5" />
                </button>
              </div>
            </form>
            <p className="mt-3 text-[10px] text-center text-text-tertiary font-bold uppercase tracking-widest opacity-50">
              Neural Network Version 4.2 • Context-Aware Analysis
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}