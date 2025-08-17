import { useState, useEffect, useRef } from 'react';
import { XMarkIcon, PaperAirplaneIcon, SparklesIcon, BriefcaseIcon, AcademicCapIcon, ChartBarIcon } from '@heroicons/react/24/solid';
import { useCareerCoachStore } from '../../stores/careerCoachStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const COACHING_SUGGESTIONS = [
  {
    icon: <BriefcaseIcon className="w-4 h-4" />,
    text: "What are the biggest issues with my resume right now?",
    category: "Resume Review"
  },
  {
    icon: <ChartBarIcon className="w-4 h-4" />,
    text: "What skills should I focus on developing next?",
    category: "Skill Development"
  },
  {
    icon: <SparklesIcon className="w-4 h-4" />,
    text: "How can I make my resume more ATS-friendly?",
    category: "ATS Optimization"
  },
  {
    icon: <AcademicCapIcon className="w-4 h-4" />,
    text: "What's the best way to quantify my achievements?",
    category: "Achievement Writing"
  },
  {
    icon: <BriefcaseIcon className="w-4 h-4" />,
    text: "What salary should I be targeting for my next role?",
    category: "Salary Planning"
  },
  {
    icon: <ChartBarIcon className="w-4 h-4" />,
    text: "Help me prepare for behavioral interview questions",
    category: "Interview Prep"
  }
];

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeTitle?: string;
}

export default function ChatModal({ isOpen, onClose, resumeTitle }: ChatModalProps) {
  const { messages, sendMessage, isLoading, error, selectedResume, clearError, clearMessages } = useCareerCoachStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Clear messages when modal opens fresh
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      clearError();
    }
  }, [isOpen, clearError, messages.length]);

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
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col border border-dark-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-border bg-gradient-to-r from-dark-secondary to-dark-tertiary rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">AI Career Coach</h2>
              <p className="text-sm text-dark-text-secondary">
                {resumeTitle ? `Coaching for: ${resumeTitle}` : 'Personalized career guidance'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {selectedResume && (
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                Online
              </div>
            )}
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-dark-text-secondary hover:text-white"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Content */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {/* Welcome Message */}
          {showSuggestions && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-lg border border-teal-500/20">
              <div className="flex items-center gap-2 mb-3">
                <SparklesIcon className="w-5 h-5 text-teal-400" />
                <h3 className="font-semibold text-dark-text-primary">Welcome to your AI Career Coach!</h3>
              </div>
              <p className="text-sm text-dark-text-secondary mb-4">
                I'm here to chat about your career! I've analyzed your resume and I'm ready to help with anything from resume optimization to salary negotiation, interview prep, or planning your next career move.
              </p>
              <p className="text-xs text-dark-text-muted">
                Ask me anything you'd like to know, or try one of these conversation starters:
              </p>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {/* Coaching Suggestions */}
            {showSuggestions && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {COACHING_SUGGESTIONS.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion.text)}
                    className="flex items-center gap-3 p-3 text-left bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors group border border-dark-border hover:border-teal-500/30"
                  >
                    <div className="text-teal-400 group-hover:text-teal-300 flex-shrink-0">
                      {suggestion.icon}
                    </div>
                    <div className="flex-grow min-w-0">
                      <span className="text-sm text-dark-text-primary group-hover:text-white block truncate">
                        {suggestion.text}
                      </span>
                      <div className="text-xs text-dark-text-muted">
                        {suggestion.category}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Chat Messages */}
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex items-end gap-3 ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'ai' && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 self-end mb-1 ${
                    msg.error 
                      ? 'bg-gradient-to-r from-red-500 to-red-600' 
                      : 'bg-gradient-to-r from-blue-500 to-purple-600'
                  }`}>
                    <SparklesIcon className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-md lg:max-w-lg px-4 py-3 rounded-2xl ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-teal-700 text-white'
                      : msg.error
                      ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                      : 'bg-gray-700 text-dark-text-primary border border-dark-border'
                  }`}
                >
                  <div 
                    className={`text-sm whitespace-pre-wrap prose prose-sm max-w-none ${
                      msg.sender === 'ai' && !msg.error ? 'prose-invert' : ''
                    }`}
                    dangerouslySetInnerHTML={{ 
                      __html: msg.sender === 'ai' ? msg.text.replace(/\n/g, '<br/>') : msg.text 
                    }}
                  />
                  {msg.error && (
                    <div className="mt-2 pt-2 border-t border-red-500/20">
                      <button 
                        onClick={clearError}
                        className="text-xs text-red-300 hover:text-red-200 underline transition-colors"
                      >
                        Try again
                      </button>
                    </div>
                  )}
                </div>
                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-600 to-gray-700 flex items-center justify-center flex-shrink-0 self-end mb-1">
                    <span className="text-white text-xs font-semibold">You</span>
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start items-end gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <SparklesIcon className="w-4 h-4 text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-gray-700 text-dark-text-primary border border-dark-border">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-dark-text-secondary">AI Coach is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            {error && !messages.some(msg => msg.error) && (
              <div className="p-4 bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/20 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-400 text-sm font-medium">Connection Error</span>
                </div>
                <p className="text-red-300 text-sm">{error}</p>
                <button 
                  onClick={clearError}
                  className="mt-2 text-xs text-red-300 hover:text-red-200 underline transition-colors"
                >
                  Dismiss
                </button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="flex items-center gap-3 p-4 bg-gray-800 rounded-xl border border-dark-border">
            <div className="flex-grow relative">
              <Input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={selectedResume ? "Ask me anything about your career..." : "Select a resume first..."}
                className="pr-12 bg-gray-700 border-dark-border focus:border-teal-500 text-white placeholder-dark-text-muted"
                disabled={isLoading || !selectedResume}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <SparklesIcon className="w-4 h-4 text-teal-400" />
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim() || !selectedResume} 
              className="btn-primary-dark p-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </Button>
          </form>

          {/* Quick Actions */}
          {!showSuggestions && messages.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 justify-center">
              {[
                { text: 'What else should I work on?', label: 'More feedback' },
                { text: 'How do I negotiate salary?', label: 'Salary tips' },
                { text: 'What questions will they ask in interviews?', label: 'Interview prep' },
                { text: 'What are my next career options?', label: 'Career path' }
              ].map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(action.text)}
                  className="text-xs px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-full text-dark-text-secondary hover:text-dark-text-primary transition-colors border border-dark-border hover:border-teal-500/30"
                  disabled={isLoading}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}