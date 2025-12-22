import { useState, useEffect, useRef } from 'react';
import { PaperAirplaneIcon, SparklesIcon, BriefcaseIcon, AcademicCapIcon, ChartBarIcon } from '@heroicons/react/24/solid';
import { useCareerCoachStore } from '../../stores/careerCoachStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const COACHING_SUGGESTIONS = [
  {
    icon: <BriefcaseIcon className="w-4 h-4" />,
    text: "How can I improve my resume to get more interviews?",
    category: "Resume"
  },
  {
    icon: <ChartBarIcon className="w-4 h-4" />,
    text: "What skills should I develop for career advancement?",
    category: "Skills"
  },
  {
    icon: <SparklesIcon className="w-4 h-4" />,
    text: "Help me optimize my resume for ATS systems",
    category: "ATS"
  },
  {
    icon: <AcademicCapIcon className="w-4 h-4" />,
    text: "What's the best way to highlight my achievements?",
    category: "Achievements"
  },
  {
    icon: <BriefcaseIcon className="w-4 h-4" />,
    text: "Review my work experience section",
    category: "Experience"
  },
  {
    icon: <ChartBarIcon className="w-4 h-4" />,
    text: "What salary range should I expect for my experience?",
    category: "Salary"
  }
];

export default function ChatInterface() {
  const { messages, sendMessage, isLoading, error, selectedResume, clearError, isBackendHealthy, checkBackendHealth } = useCareerCoachStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedResume) return;

    await sendMessage(input, selectedResume._id!);
    setInput('');
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const showSuggestions = messages.length === 0 && !isLoading;

  return (
    <div className="flex flex-col h-full">
      {/* Welcome Message */}
      {showSuggestions && (
        <div className="mb-4 p-4 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-lg border border-teal-500/20">
          <div className="flex items-center gap-2 mb-2">
            <SparklesIcon className="w-5 h-5 text-teal-400" />
            <h3 className="font-semibold text-text-primary">AI Career Coach Ready!</h3>
          </div>
          <p className="text-sm text-text-secondary">
            I'm here to help you optimize your resume and advance your career. Ask me anything or try one of these suggestions:
          </p>
        </div>
      )}

      <div className="flex-grow space-y-4 overflow-y-auto pr-2">
        {/* Coaching Suggestions */}
        {showSuggestions && (
          <div className="grid grid-cols-1 gap-2">
            {COACHING_SUGGESTIONS.slice(0, 4).map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion.text)}
                className="flex items-center gap-3 p-3 text-left bg-surface-50 hover:bg-gray-700 rounded-lg transition-colors group border border-surface-200 hover:border-teal-500/30"
              >
                <div className="text-teal-400 group-hover:text-teal-300">
                  {suggestion.icon}
                </div>
                <div className="flex-grow">
                  <span className="text-sm text-text-primary group-hover:text-white">
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
            className={`flex items-end gap-2 ${
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
              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-teal-700 text-white ml-8'
                  : msg.error
                  ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                  : 'bg-gray-700 text-text-primary border border-surface-200'
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
                    onClick={() => {
                      clearError();
                      if (!isBackendHealthy) {
                        checkBackendHealth();
                      }
                    }}
                    className="text-xs text-red-300 hover:text-red-200 underline transition-colors"
                  >
                    Retry connection
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
          <div className="flex justify-start items-end gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <SparklesIcon className="w-4 h-4 text-white" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-gray-700 text-text-primary border border-surface-200">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-text-secondary">AI Coach is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="p-4 bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/20 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-400 text-sm font-medium">Connection Error</span>
            </div>
            <p className="text-red-300 text-sm">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 text-xs text-red-300 hover:text-red-200 underline transition-colors"
            >
              Try refreshing the page
            </button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="mt-4 flex items-center gap-2">
        <div className="flex-grow relative">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={selectedResume ? "Ask me anything about your resume..." : "Select a resume first..."}
            className="pr-12 bg-surface-50 border-surface-200 focus:border-teal-500"
            disabled={isLoading || !selectedResume}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <SparklesIcon className="w-4 h-4 text-teal-400" />
          </div>
        </div>
        <Button 
          type="submit" 
          disabled={isLoading || !input.trim() || !selectedResume} 
          className="btn-primary-dark p-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <PaperAirplaneIcon className="w-5 h-5" />
        </Button>
      </form>

      {/* Quick Actions */}
      {!showSuggestions && messages.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {COACHING_SUGGESTIONS.slice(4, 6).map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion.text)}
              className="text-xs px-3 py-1 bg-surface-50 hover:bg-gray-700 rounded-full text-text-secondary hover:text-text-primary transition-colors border border-surface-200 hover:border-teal-500/30"
              disabled={isLoading}
            >
              {suggestion.category}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
