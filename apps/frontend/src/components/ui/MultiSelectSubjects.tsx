import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Plus, Search } from 'lucide-react';

const SA_SUBJECTS = [
  "Mathematics", "Mathematical Literacy", "Technical Mathematics",
  "Physical Sciences", "Life Sciences", "Technical Sciences",
  "Accounting", "Business Studies", "Economics",
  "Geography", "History", "Life Orientation", "Religion Studies",
  "Information Technology (IT)", "Computer Applications Technology (CAT)", "Engineering Graphics and Design (EGD)",
  "Consumer Studies", "Hospitality Studies", "Tourism",
  "Dramatic Arts", "Visual Arts", "Music", "Design",
  "Agricultural Sciences", "Agricultural Management Practices",
  "English Home Language", "English First Additional Language",
  "Afrikaans Huistaal", "Afrikaans Eerste Addisionele Taal",
  "IsiZulu Home Language", "IsiZulu First Additional Language",
  "IsiXhosa Home Language", "IsiXhosa First Additional Language",
  "Sepedi", "Sesotho", "Setswana", "Xitsonga", "SiSwati", "Tshivenda", "IsiNdebele"
];

interface MultiSelectSubjectsProps {
  selectedSubjects: string[];
  onChange: (subjects: string[]) => void;
  placeholder?: string;
}

export const MultiSelectSubjects: React.FC<MultiSelectSubjectsProps> = ({ 
  selectedSubjects = [], 
  onChange,
  placeholder = "Type to add subject..." 
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter subjects based on input, excluding already selected ones
  const filteredSubjects = SA_SUBJECTS.filter(subject => 
    subject.toLowerCase().includes(inputValue.toLowerCase()) && 
    !selectedSubjects.includes(subject)
  );

  // Allow adding custom subject if it doesn't match exactly
  const showCustomOption = inputValue.trim().length > 0 && 
    !filteredSubjects.some(s => s.toLowerCase() === inputValue.trim().toLowerCase()) &&
    !selectedSubjects.some(s => s.toLowerCase() === inputValue.trim().toLowerCase());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addSubject = (subject: string) => {
    onChange([...selectedSubjects, subject]);
    setInputValue("");
    setIsOpen(true); // Keep open for rapid selection
    inputRef.current?.focus();
  };

  const removeSubject = (subjectToRemove: string) => {
    onChange(selectedSubjects.filter(s => s !== subjectToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < filteredSubjects.length + (showCustomOption ? 0 : -1) ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen) {
        if (highlightedIndex < filteredSubjects.length) {
          addSubject(filteredSubjects[highlightedIndex]);
        } else if (showCustomOption) {
          addSubject(inputValue.trim());
        }
      } else {
        setIsOpen(true);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "Backspace" && inputValue === "" && selectedSubjects.length > 0) {
      removeSubject(selectedSubjects[selectedSubjects.length - 1]);
    }
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <div 
        className="min-h-[56px] w-full p-2 bg-surface-50 border border-surface-200 rounded-xl focus-within:bg-white focus-within:border-brand-blue focus-within:ring-4 focus-within:ring-brand-blue/5 transition-all flex flex-wrap gap-2 items-center cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        <AnimatePresence>
          {selectedSubjects.map((subject) => (
            <motion.span 
              key={subject}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-surface-200 rounded-lg text-sm font-bold text-brand-dark shadow-sm group"
            >
              {subject}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeSubject(subject); }}
                className="p-0.5 rounded-full hover:bg-red-50 text-text-tertiary hover:text-red-500 transition-colors"
              >
                <X size={12} strokeWidth={3} />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedSubjects.length === 0 ? placeholder : ""}
          className="flex-1 bg-transparent border-none outline-none text-sm font-medium min-w-[120px] h-8 text-brand-dark placeholder:text-text-tertiary"
        />
      </div>

      <AnimatePresence>
        {isOpen && (filteredSubjects.length > 0 || showCustomOption) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full max-w-sm mt-1 bg-white border border-surface-200 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar"
            style={{ width: containerRef.current?.offsetWidth }}
          >
            {filteredSubjects.map((subject, index) => (
              <button
                key={subject}
                onClick={() => addSubject(subject)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full px-4 py-3 text-left text-sm font-medium flex items-center justify-between transition-colors ${
                  index === highlightedIndex ? 'bg-brand-blue/5 text-brand-blue' : 'text-brand-dark hover:bg-surface-50'
                }`}
              >
                {subject}
                {index === highlightedIndex && <Plus size={14} strokeWidth={2.5} />}
              </button>
            ))}
            
            {showCustomOption && (
              <button
                onClick={() => addSubject(inputValue.trim())}
                onMouseEnter={() => setHighlightedIndex(filteredSubjects.length)}
                className={`w-full px-4 py-3 text-left text-sm font-bold border-t border-surface-100 flex items-center gap-2 transition-colors ${
                  highlightedIndex === filteredSubjects.length ? 'bg-brand-purple/5 text-brand-purple' : 'text-brand-purple hover:bg-surface-50'
                }`}
              >
                <Plus size={14} strokeWidth={2.5} />
                Add "{inputValue}"
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
