import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const COUNTRY_CODES = [
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+263', country: 'Zimbabwe', flag: '🇿🇼' },
  { code: '+258', country: 'Mozambique', flag: '🇲🇿' },
  { code: '+266', country: 'Lesotho', flag: '🇱🇸' },
  { code: '+267', country: 'Botswana', flag: '🇧🇼' },
  { code: '+268', country: 'Eswatini', flag: '🇸🇿' },
  { code: '+264', country: 'Namibia', flag: '🇳🇦' },
  { code: '+265', country: 'Malawi', flag: '🇲🇼' },
  { code: '+260', country: 'Zambia', flag: '🇿🇲' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
  { code: '+233', country: 'Ghana', flag: '🇬🇭' },
  { code: '+243', country: 'DRC', flag: '🇨🇩' },
  { code: '+251', country: 'Ethiopia', flag: '🇪🇹' },
  { code: '+252', country: 'Somalia', flag: '🇸🇴' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+1', country: 'USA', flag: '🇺🇸' },
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  defaultCountryCode?: string;
}

export const PhoneInput = ({ value, onChange, placeholder = "Phone number", className, defaultCountryCode = "+27" }: PhoneInputProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Split value into code and number
  const detectedCode = COUNTRY_CODES.find(c => value?.startsWith(c.code))?.code || defaultCountryCode;
  const numberPart = value?.startsWith(detectedCode) ? value.slice(detectedCode.length) : value;

  const [selectedCode, setSelectedCode] = useState(detectedCode);

  useEffect(() => {
    const newCode = COUNTRY_CODES.find(c => value?.startsWith(c.code))?.code;
    if (newCode && newCode !== selectedCode) {
      setSelectedCode(newCode);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCodeSelect = (code: string) => {
    setSelectedCode(code);
    onChange(`${code}${numberPart}`);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanNum = e.target.value.replace(/[^\d\s]/g, '');
    onChange(`${selectedCode}${cleanNum}`);
  };

  const filteredCodes = COUNTRY_CODES.filter(c => 
    c.country.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.code.includes(searchQuery)
  );

  const selectedCountry = COUNTRY_CODES.find(c => c.code === selectedCode);

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div className={`flex items-center transition-all duration-300 rounded-[1.25rem] border-2 bg-[#f8fafc] overflow-hidden min-h-[56px] ${
        isFocused 
          ? 'border-[#3b82f6] bg-white shadow-[0_10px_25px_-5px_rgba(59,130,246,0.1)] -translate-y-[1px]' 
          : 'border-[#f1f5f9]'
      }`}>
        {/* Country Code Select */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-3 hover:bg-black/5 transition-colors border-r border-surface-200 h-full"
        >
          <span className="text-lg leading-none">{selectedCountry?.flag}</span>
          <span className="text-sm font-bold text-brand-dark">{selectedCode}</span>
          <ChevronDown size={14} className="text-text-tertiary" />
        </button>

        {/* Number Input */}
        <input
          type="tel"
          value={numberPart || ''}
          onChange={handleNumberChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent px-4 py-3 font-semibold text-brand-dark outline-none placeholder:text-text-tertiary/60"
        />
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-50 w-64 mt-2 bg-white rounded-xl shadow-xl border border-surface-200 max-h-60 overflow-y-auto custom-scrollbar left-0"
          >
            <div className="p-2 sticky top-0 bg-white border-b border-surface-50">
              <input
                autoFocus
                placeholder="Search country..."
                className="w-full px-3 py-2 bg-surface-50 rounded-lg text-sm font-medium focus:outline-none focus:ring-1 focus:ring-brand-blue/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {filteredCodes.map((item) => (
              <button
                key={item.country}
                onClick={() => handleCodeSelect(item.code)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-50 transition-colors border-b border-surface-50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{item.flag}</span>
                  <span className="font-medium text-brand-dark">{item.country}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-text-tertiary">{item.code}</span>
                  {selectedCode === item.code && <Check size={14} className="text-brand-blue" />}
                </div>
              </button>
            ))}
            {filteredCodes.length === 0 && (
              <div className="p-4 text-center text-xs text-text-tertiary font-medium">
                No countries found
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
