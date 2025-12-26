import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, GraduationCap, ArrowRight, CheckCircle2, Globe, ChevronLeft } from 'lucide-react';

interface LocationEducationCheckProps {
  onComplete: (data: { location: string; education: string }) => void;
  onCancel: () => void;
  initialStep?: number;
  initialLocation?: string;
}

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 50 : -50,
    opacity: 0
  })
};

export const LocationEducationCheck: React.FC<LocationEducationCheckProps> = ({ 
  onComplete, 
  onCancel, 
  initialStep = 1,
  initialLocation = ''
}) => {
  const [step, setStep] = useState(initialStep);
  const [direction, setDirection] = useState(0);
  const [location, setLocation] = useState(initialLocation);
  const [education, setEducation] = useState('');

  const handleNext = () => {
    if (step === 1 && location) {
      setDirection(1);
      if (location === 'South Africa') {
        setStep(2);
      } else {
        onComplete({ location, education: 'Other' });
      }
    } else if (step === 2 && education) {
      onComplete({ location, education });
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setDirection(-1);
      setStep(1);
    } else {
      onCancel();
    }
  };

  const OptionCard = ({ selected, onClick, icon: Icon, label }: any) => (
    <button
      onClick={onClick}
      className={`w-full p-4 md:p-3.5 rounded-xl border-2 flex items-center justify-between transition-all duration-200 group relative overflow-hidden ${
        selected 
          ? 'border-brand-blue bg-white shadow-[0_8px_30px_rgb(59,130,246,0.08)]' 
          : 'border-surface-100 bg-white hover:border-surface-300 hover:bg-surface-50'
      }`}
    >
      <div className="flex items-center gap-3 relative z-10">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
          selected ? 'bg-brand-blue text-white' : 'bg-surface-50 text-text-tertiary group-hover:bg-white group-hover:shadow-sm'
        }`}>
          <Icon size={20} strokeWidth={selected ? 2.5 : 2} />
        </div>
        <span className={`text-sm md:text-base font-bold ${selected ? 'text-brand-dark' : 'text-text-secondary'}`}>
          {label}
        </span>
      </div>
      
      {selected && (
        <motion.div 
          initial={{ scale: 0 }} 
          animate={{ scale: 1 }}
          className="relative z-10 text-brand-blue"
        >
          <CheckCircle2 size={20} strokeWidth={3} />
        </motion.div>
      )}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-surface-50/90 backdrop-blur-xl md:bg-brand-dark/40 lg:pl-72 transition-all duration-300">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full h-full md:h-auto md:max-w-md bg-white md:rounded-[2.5rem] shadow-none md:shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-12 pb-4 md:pt-6 md:pb-4 border-b border-surface-100 flex items-center justify-between bg-white relative z-20">
          <button 
            onClick={handleBack}
            className="w-8 h-8 rounded-full bg-surface-50 flex items-center justify-center text-brand-dark hover:bg-surface-100 transition-colors"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
          
          <div className="flex gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${step >= 1 ? 'bg-brand-blue' : 'bg-surface-200'}`} />
            <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${step >= 2 ? 'bg-brand-blue' : 'bg-surface-200'}`} />
          </div>
          
          <div className="w-8" />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8 md:py-6 relative">
          <AnimatePresence mode="wait" custom={direction}>
            {step === 1 ? (
              <motion.div
                key="step1"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-brand-dark tracking-tight">Where are you?</h2>
                  <p className="text-sm text-text-secondary font-medium leading-relaxed">Optimize your resume for your region.</p>
                </div>

                <div className="space-y-2.5">
                  {[
                    'South Africa', 
                    'United States', 
                    'United Kingdom', 
                    'Other'
                  ].map((loc) => (
                    <OptionCard 
                      key={loc}
                      label={loc}
                      icon={Globe}
                      selected={location === loc}
                      onClick={() => setLocation(loc)}
                    />
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-brand-dark tracking-tight">Academic Level?</h2>
                  <p className="text-sm text-text-secondary font-medium leading-relaxed">Selecting the perfect structure.</p>
                </div>

                <div className="space-y-2.5">
                  {[
                    { label: 'Grade 12 or Lower', value: 'Grade 12' },
                    { label: 'Certificate / Diploma', value: 'Certificate' },
                    { label: 'University Degree', value: 'Degree' },
                    { label: 'Postgraduate', value: 'Postgrad' }
                  ].map((edu) => (
                    <OptionCard 
                      key={edu.value}
                      label={edu.label}
                      icon={GraduationCap}
                      selected={education === edu.value}
                      onClick={() => setEducation(edu.value)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Action */}
        <div className="p-6 md:p-8 bg-white border-t border-surface-100 pb-safe md:pt-0">
          <button 
            onClick={handleNext}
            disabled={(step === 1 && !location) || (step === 2 && !education)}
            className="w-full py-3.5 bg-brand-dark text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-dark/20 disabled:opacity-50 disabled:shadow-none active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {step === 1 ? 'Next' : 'Start Building'}
            <ArrowRight size={16} strokeWidth={3} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};