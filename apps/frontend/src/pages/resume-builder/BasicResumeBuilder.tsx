import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, ChevronRight, ChevronDown, Trash2, Plus, GraduationCap, Briefcase, User, Star, CheckCircle2, Loader2 } from 'lucide-react';
import { ResumeProvider, useResume } from '../../contexts/ResumeContext';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { MultiSelectSubjects } from '../../components/ui/MultiSelectSubjects';
import { PhoneInput } from '../../components/ui/PhoneInput';

// Simplified Steps for Basic Builder
const STEPS = [
  { id: 'personal', title: 'Personal', icon: User },
  { id: 'education', title: 'Education', icon: GraduationCap },
  { id: 'skills', title: 'Skills', icon: Star },
  { id: 'experience', title: 'Work', icon: Briefcase },
  { id: 'references', title: 'Refs', icon: CheckCircle2 },
  { id: 'review', title: 'Finish', icon: Sparkles }
];

const InputGroup = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-[11px] font-black text-brand-dark/60 uppercase tracking-[0.1em] pl-1">{label}</label>
    {children}
  </div>
);

const Combobox = ({ value, onChange, options, placeholder }: { value: string, onChange: (val: string) => void, options: string[], placeholder?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(value?.toLowerCase() || '')
  );

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          className="input-minimal pr-10"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
        />
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-dark/40 hover:text-brand-blue transition-colors"
        >
          <ChevronDown size={20} />
        </button>
      </div>
      
      <AnimatePresence>
        {isOpen && (filteredOptions.length > 0 || value) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-surface-200 max-h-60 overflow-y-auto custom-scrollbar"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  className="w-full text-left px-4 py-3 text-sm font-medium text-brand-dark hover:bg-surface-50 transition-colors border-b border-surface-50 last:border-0"
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                  }}
                >
                  {option}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-text-tertiary italic">
                Press Enter to use "{value}"
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MultiCombobox = ({ value, onChange, options, placeholder }: { value: string, onChange: (val: string) => void, options: string[], placeholder?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Parse current CSV value into array
  const selectedItems = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAdd = (item: string) => {
    if (!selectedItems.includes(item)) {
      const newItems = [...selectedItems, item];
      onChange(newItems.join(', '));
    }
    setInputValue('');
    setIsOpen(false);
  };

  const handleRemove = (item: string) => {
    const newItems = selectedItems.filter(i => i !== item);
    onChange(newItems.join(', '));
  };

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(inputValue.toLowerCase()) && !selectedItems.includes(opt)
  );

  return (
    <div className="relative space-y-2" ref={wrapperRef}>
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedItems.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1 px-3 py-1 bg-brand-blue/10 text-brand-blue rounded-lg text-sm font-bold">
            <span>{item}</span>
            <button 
              onClick={() => handleRemove(item)}
              className="hover:text-red-500 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
      
      <div className="relative">
        <input
          className="input-minimal pr-10"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && inputValue) {
              e.preventDefault();
              handleAdd(inputValue);
            }
          }}
          placeholder={selectedItems.length === 0 ? placeholder : "Add more..."}
        />
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-dark/40 hover:text-brand-blue transition-colors"
        >
          <ChevronDown size={20} />
        </button>
      </div>
      
      <AnimatePresence>
        {isOpen && (filteredOptions.length > 0 || inputValue) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-surface-200 max-h-60 overflow-y-auto custom-scrollbar"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  className="w-full text-left px-4 py-3 text-sm font-medium text-brand-dark hover:bg-surface-50 transition-colors border-b border-surface-50 last:border-0"
                  onClick={() => handleAdd(option)}
                >
                  {option}
                </button>
              ))
            ) : (
              <button
                className="w-full text-left px-4 py-3 text-sm font-medium text-brand-blue hover:bg-surface-50 transition-colors italic"
                onClick={() => handleAdd(inputValue)}
              >
                Add "{inputValue}"
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const BasicResumeBuilderContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { resumeData, updateResumeData, saveToStorage, clearStorage } = useResume();
  const [currentStep, setCurrentStep] = useState(0);
  const [loadingAI, setLoadingAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Local state for performant typing and robust updates
  const [localData, setLocalData] = useState<any>(null);
  const isInitialMount = useRef(true);

  // Initialize localData
  useEffect(() => {
    // 1. Try to load from navigation state first (fastest, used when clicking 'Modify')
    if (location.state?.resumeData && isInitialMount.current) {
      console.log('📦 Initializing from navigation state');
      const data = JSON.parse(JSON.stringify(location.state.resumeData));
      // Ensure arrays exist
      data.workExperience = (data.workExperience || []).map((exp: any) => ({
        ...exp,
        jobTitle: exp.jobTitle || exp.title || '',
        company: exp.company || exp.companyName || '',
        startDate: exp.startDate ? new Date(exp.startDate) : undefined,
        endDate: exp.endDate ? new Date(exp.endDate) : undefined,
      }));
      data.education = data.education || [];
      data.skills = data.skills || [];
      data.references = data.references || [];
      
      if (!data.personalInfo) data.personalInfo = {};
      
      setLocalData(data);
      updateResumeData(data);
      isInitialMount.current = false;
      return; // Skip other initializers
    }

    // 2. Handle 'new' case (no ID or ID is 'new')
    if ((!id || id === 'new') && isInitialMount.current) {
      console.log('✨ Initializing fresh resume state');
      setLocalData({
        personalInfo: {},
        education: [],
        workExperience: [],
        skills: [],
        references: [],
        templateId: 'basic_sa',
        title: 'My Basic Resume'
      });
      isInitialMount.current = false;
      return;
    }

    // 3. Fallback to context if available
    if (isInitialMount.current && Object.keys(resumeData).length > 0) {
      const data = JSON.parse(JSON.stringify(resumeData));
      // ... (rest of existing logic) ...
      // Ensure arrays exist
      data.workExperience = data.workExperience || [];
      data.education = data.education || [];
      data.skills = data.skills || [];
      data.references = data.references || [];
      
      if (!data.personalInfo) data.personalInfo = {};
      if (!data.personalInfo.nationality && (data.targetLocation === 'South Africa' || data.templateId === 'basic_sa')) {
        data.personalInfo.nationality = 'South African';
      }
      
      if (data.professionalSummary === undefined) data.professionalSummary = '';
      
      setLocalData(data);
      isInitialMount.current = false;
    }
  }, [resumeData, id, location.state]);

  // Load existing resume from API if ID is present and not 'new' AND not loaded from state
  useEffect(() => {
    const fetchResume = async () => {
      // Skip if we already loaded data from state matching this ID
      if (localData && localData._id === id) return;

      if (id && id !== 'new') {
        try {
          const response = await api.get(`/resumes/${id}`);
          if (response.data.success) {
            const data = response.data.data;
            // Ensure arrays exist for editing
            data.workExperience = (data.workExperience || []).map((exp: any) => ({
              ...exp,
              jobTitle: exp.jobTitle || exp.title || '',
              company: exp.company || exp.companyName || '',
            }));
            data.education = data.education || [];
            data.skills = data.skills || [];
            data.references = data.references || [];
            
            updateResumeData(data);
            setLocalData(data);
          }
        } catch (error) {
          toast.error('Failed to load resume');
          navigate('/dashboard/resume');
        }
      }
    };
    if (id && !location.state?.resumeData) fetchResume();
  }, [id, location.state]);

  // Initialize with location/education data if passed
  useEffect(() => {
    if (location.state?.targetLocation && location.state?.educationLevel && localData) {
      const updated = {
        ...localData,
        targetLocation: location.state.targetLocation,
        educationLevel: location.state.educationLevel,
        templateId: 'basic_sa',
        personalInfo: {
          ...(localData.personalInfo || {}),
          // Auto-fill residential address if empty so user sees it
          residentialAddress: localData.personalInfo?.residentialAddress || location.state.targetLocation,
          // Ensure backend required 'location' field is set
          location: localData.personalInfo?.location || location.state.targetLocation
        }
      };
      setLocalData(updated);
      updateResumeData(updated);
    }
  }, [location.state, !!localData]);

  // Helper for robust nested updates
  const updatePersonalInfo = (field: string, value: string) => {
    setLocalData((prev: any) => ({
      ...prev,
      personalInfo: {
        ...(prev?.personalInfo || {}),
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      syncToContext();
      
      const payload = {
        ...localData,
        // Ensure template is set
        templateId: 'basic_sa',
        // Ensure title exists
        title: localData.title || `${localData.personalInfo?.firstName || 'My'} ${localData.personalInfo?.lastName || 'Resume'}`
      };

      let savedResume;
      if (localData._id && localData._id !== 'new') {
        const response = await api.put(`/resumes/${localData._id}`, payload);
        savedResume = response.data.data;
        toast.success('Resume updated successfully');
      } else {
        const response = await api.post('/resumes', payload);
        savedResume = response.data.data;
        toast.success('Resume created successfully');
      }

      // Update local state with saved data (including new ID)
      setLocalData(savedResume);
      updateResumeData(savedResume);
      
      // Explicitly clear storage to prevent auto-fill on next new resume
      clearStorage();
      
      // Brute-force clear to ensure no lingering data
      const user = JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.user;
      if (user?.id) {
        localStorage.removeItem(`resume-builder-data-${user.id}`);
        localStorage.removeItem(`resume-ai-data-${user.id}`);
      }
      localStorage.removeItem('resume-builder-data'); // legacy
      
      return savedResume._id;
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save resume');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  if (!localData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
      </div>
    );
  }

  const updateLocal = (newData: any) => {
    setLocalData((prev: any) => ({ ...prev, ...newData }));
  };

  const syncToContext = () => {
    updateResumeData(localData);
  };

  const handleNext = () => {
    // Validation logic for compulsory fields
    if (STEPS[currentStep].id === 'personal') {
      const { personalInfo } = localData;
      const requiredFields = [
        { field: 'lastName', label: 'Surname' },
        { field: 'firstName', label: 'First Name' },
        { field: 'identityNumber', label: 'Identity Number' },
        { field: 'dateOfBirth', label: 'Date of Birth' },
        { field: 'gender', label: 'Gender' },
        { field: 'nationality', label: 'Nationality' },
        { field: 'maritalStatus', label: 'Marital Status' },
        { field: 'homeLanguage', label: 'Home Language' },
        { field: 'residentialAddress', label: 'Residential Address' },
        { field: 'phone', label: 'Contact Number' },
        { field: 'email', label: 'Email Address' }
      ];

      for (const item of requiredFields) {
        if (!personalInfo?.[item.field]?.trim()) {
          toast.error(`${item.label} is compulsory.`);
          return;
        }
      }
      
      // ID Number length validation
      if (personalInfo.identityNumber.length !== 13) {
        toast.error('Identity Number must be exactly 13 digits.');
        return;
      }
    }

    if (STEPS[currentStep].id === 'education') {
      const edu = localData.education?.[0];
      if (!edu?.institution?.trim()) {
        toast.error('School Name is compulsory.');
        return;
      }
      if (!edu?.degree?.trim()) {
        toast.error('Grade Passed is compulsory.');
        return;
      }
      if (!edu?.graduationDate) {
        toast.error('Year Finished is compulsory.');
        return;
      }
    }

    syncToContext();
    // Use a small timeout to let context update before saving
    setTimeout(() => saveToStorage(), 100);
    
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(curr => curr + 1);
    }
  };

  const handleBack = () => {
    syncToContext();
    if (currentStep > 0) {
      setCurrentStep(curr => curr - 1);
    } else {
      navigate('/dashboard/resume');
    }
  };

  const generateAIProfile = async () => {
    if (!localData.personalInfo?.firstName || !localData.skills?.length) {
      toast.error('Name & Skills required.');
      return;
    }
    setLoadingAI(true);
    try {
      const response = await api.post('/resumes/optimize-basic-summary', {
        skills: localData.skills.map((s: any) => s.name),
        education: localData.education?.[0]?.degree || 'Grade 12',
        experience: localData.workExperience
      });
      
      if (response.data.success) {
        const updated = { ...localData, professionalSummary: response.data.data.summary };
        setLocalData(updated);
        updateResumeData(updated);
        toast.success('Summary generated!');
      }
    } catch (error) {
      toast.error('AI generation failed.');
    } finally {
      setLoadingAI(false);
    }
  };

  const renderStep = () => {
    switch (STEPS[currentStep].id) {
      case 'personal':
        const SA_NATIONALITIES = [
          'South African', 'Zimbabwean', 'Mozambican', 'Basotho', 'Motswana', 'Swati', 
          'Namibian', 'Nigerian', 'Congolese', 'Ethiopian', 'Somali', 'Ghanaian', 
          'Pakistani', 'Bangladeshi', 'Indian', 'Chinese', 'Malawian', 'Zambian'
        ];

        const SA_LANGUAGES = [
          'English', 'IsiZulu', 'IsiXhosa', 'Afrikaans', 'Sepedi', 'Setswana', 
          'Sesotho', 'Xitsonga', 'SiSwati', 'Tshivenda', 'IsiNdebele', 'Shona', 
          'French', 'Portuguese', 'Swahili', 'Chewa'
        ];

        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-1 px-1">
              <h2 className="text-2xl font-black text-brand-dark tracking-tight">Personal Details</h2>
              <p className="text-sm text-text-secondary font-medium">Standard South African CV Information</p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup label="Surname (Last Name)">
                  <input 
                    className="input-minimal"
                    placeholder="e.g. Mongamgue"
                    value={localData.personalInfo?.lastName || ''}
                    onChange={e => updatePersonalInfo('lastName', e.target.value)}
                  />
                </InputGroup>
                <InputGroup label="First Name(s)">
                  <input 
                    className="input-minimal"
                    placeholder="e.g. Phakama"
                    value={localData.personalInfo?.firstName || ''}
                    onChange={e => updatePersonalInfo('firstName', e.target.value)}
                  />
                </InputGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup label="Identity Number">
                  <input 
                    className="input-minimal"
                    placeholder="13-digit ID"
                    maxLength={13}
                    value={localData.personalInfo?.identityNumber || ''}
                    onChange={e => updatePersonalInfo('identityNumber', e.target.value)}
                  />
                </InputGroup>
                <InputGroup label="Date of Birth">
                  <div className="relative">
                    <input 
                      type="date"
                      className="input-minimal date-input-custom"
                      value={localData.personalInfo?.dateOfBirth || ''}
                      onChange={e => updatePersonalInfo('dateOfBirth', e.target.value)}
                    />
                  </div>
                </InputGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup label="Gender">
                  <select 
                    className="input-minimal bg-white"
                    value={localData.personalInfo?.gender || ''}
                    onChange={e => updatePersonalInfo('gender', e.target.value)}
                  >
                    <option value="">Select Gender</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </InputGroup>
                <InputGroup label="Nationality">
                  <Combobox 
                    options={SA_NATIONALITIES}
                    placeholder="Select or type..."
                    value={localData.personalInfo?.nationality || ''}
                    onChange={(val) => updatePersonalInfo('nationality', val)}
                  />
                </InputGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup label="Marital Status">
                  <select 
                    className="input-minimal bg-white"
                    value={localData.personalInfo?.maritalStatus || ''}
                    onChange={e => updatePersonalInfo('maritalStatus', e.target.value)}
                  >
                    <option value="">Select Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </InputGroup>
                <InputGroup label="Home Language">
                  <Combobox 
                    options={SA_LANGUAGES}
                    placeholder="Select or type..."
                    value={localData.personalInfo?.homeLanguage || ''}
                    onChange={(val) => updatePersonalInfo('homeLanguage', val)}
                  />
                </InputGroup>
              </div>

              <InputGroup label="Other Languages">
                <MultiCombobox 
                  options={SA_LANGUAGES}
                  placeholder="Select or type (e.g. English, IsiZulu)"
                  value={localData.personalInfo?.otherLanguages || ''}
                  onChange={(val) => updatePersonalInfo('otherLanguages', val)}
                />
              </InputGroup>

              <InputGroup label="Residential Address">
                <textarea 
                  className="input-minimal h-24 pt-3 resize-none"
                  placeholder="Street, Suburb, City, Code"
                  value={localData.personalInfo?.residentialAddress || ''}
                  onChange={e => updatePersonalInfo('residentialAddress', e.target.value)}
                />
              </InputGroup>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup label="Contact Number">
                  <PhoneInput
                    value={localData.personalInfo?.phone || ''}
                    onChange={(val) => updatePersonalInfo('phone', val)}
                    defaultCountryCode={(() => {
                      const nat = localData.personalInfo?.nationality;
                      if (!nat) return '+27';
                      const map: Record<string, string> = {
                        'South African': '+27', 'Zimbabwean': '+263', 'Mozambican': '+258',
                        'Basotho': '+266', 'Motswana': '+267', 'Swati': '+268',
                        'Namibian': '+264', 'Nigerian': '+234', 'Congolese': '+243',
                        'Ethiopian': '+251', 'Somali': '+252', 'Ghanaian': '+233',
                        'Pakistani': '+92', 'Bangladeshi': '+880', 'Indian': '+91',
                        'Chinese': '+86', 'Malawian': '+265', 'Zambian': '+260'
                      };
                      return map[nat] || '+27';
                    })()}
                  />
                </InputGroup>
                <InputGroup label="Email Address">
                  <input 
                    className="input-minimal"
                    placeholder="e.g. phakama@yahoo.com"
                    type="email"
                    value={localData.personalInfo?.email || ''}
                    onChange={e => updatePersonalInfo('email', e.target.value)}
                  />
                </InputGroup>
              </div>
            </div>
          </div>
        );
      
      case 'education':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-1 px-1">
              <h2 className="text-2xl font-black text-brand-dark tracking-tight">School History</h2>
              <p className="text-sm text-text-secondary font-medium">Your highest academic achievement.</p>
            </div>

            <div className="space-y-5">
              <InputGroup label="School Name">
                <input 
                  placeholder="e.g. Orlando High School" 
                  className="input-minimal"
                  value={localData.education?.[0]?.institution || ''}
                  onChange={e => {
                    const newEdu = [...(localData.education || [])];
                    if (!newEdu[0]) newEdu[0] = { institution: '', degree: 'Grade 12', fieldOfStudy: 'General', graduationDate: new Date() };
                    newEdu[0].institution = e.target.value;
                    updateLocal({ education: newEdu });
                  }}
                />
              </InputGroup>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup label="Grade Passed">
                  <select 
                    className="input-minimal bg-white"
                    value={localData.education?.[0]?.degree || 'Grade 12'}
                    onChange={e => {
                      const newEdu = [...(localData.education || [])];
                      if (!newEdu[0]) newEdu[0] = { institution: '', degree: 'Grade 12', fieldOfStudy: 'General', graduationDate: new Date() };
                      newEdu[0].degree = e.target.value;
                      updateLocal({ education: newEdu });
                    }}
                  >
                    <option value="Grade 12">Grade 12 (Matric)</option>
                    <option value="Grade 11">Grade 11</option>
                    <option value="Grade 10">Grade 10</option>
                    <option value="Grade 9">Grade 9</option>
                  </select>
                </InputGroup>
                <InputGroup label="Year Finished">
                  <input 
                    type="number"
                    placeholder="Year" 
                    className="input-minimal"
                    value={localData.education?.[0]?.graduationDate ? new Date(localData.education[0].graduationDate).getFullYear().toString() : ''}
                    onChange={e => {
                      const newEdu = [...(localData.education || [])];
                      if (!newEdu[0]) newEdu[0] = { institution: '', degree: 'Grade 12', fieldOfStudy: 'General', graduationDate: new Date() };
                      const date = new Date();
                      date.setFullYear(parseInt(e.target.value) || 2024);
                      newEdu[0].graduationDate = date;
                      updateLocal({ education: newEdu });
                    }}
                  />
                </InputGroup>
              </div>

              <InputGroup label="Key Subjects (Optional)">
                <div className="bg-surface-50 rounded-xl">
                  <MultiSelectSubjects
                    selectedSubjects={localData.education?.[0]?.coursework || []}
                    onChange={(subjects) => {
                      const newEdu = [...(localData.education || [])];
                      if (!newEdu[0]) newEdu[0] = { institution: '', degree: 'Grade 12', fieldOfStudy: 'General', graduationDate: new Date() };
                      newEdu[0].coursework = subjects;
                      updateLocal({ education: newEdu });
                    }}
                    placeholder="Type subject (e.g. Maths)..."
                  />
                </div>
              </InputGroup>
            </div>
          </div>
        );

      case 'skills':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-1 px-1">
              <h2 className="text-2xl font-black text-brand-dark tracking-tight">Your Skills</h2>
              <p className="text-sm text-text-secondary font-medium">Select what you are best at.</p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {['Hardworking', 'Punctual', 'Cleaning', 'Driving', 'Teamwork', 'English', 'Zulu', 'Xhosa', 'Computer', 'Cooking', 'Cashier', 'Security'].map(skill => {
                const isSelected = (localData.skills || []).some((s: any) => s.name === skill);
                return (
                  <button 
                    key={skill}
                    onClick={() => {
                      const currentSkills = localData.skills || [];
                      if (!isSelected) {
                        updateLocal({ skills: [...currentSkills, { name: skill, category: 'soft', proficiencyLevel: 'expert' }] });
                      } else {
                        updateLocal({ skills: currentSkills.filter((s: any) => s.name !== skill) });
                      }
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 ${ 
                      isSelected 
                        ? 'bg-brand-blue text-white border-brand-blue shadow-lg shadow-brand-blue/20' 
                        : 'bg-white text-text-secondary border-surface-200 hover:border-brand-blue/30 hover:text-brand-blue'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}{skill}
                  </button>
                );
              })}
            </div>
            
            <div className="relative mt-2">
              <input 
                placeholder="Type other skill..." 
                className="input-minimal pr-16"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value;
                    if (val) {
                      updateLocal({ skills: [...(localData.skills || []), { name: val, category: 'soft', proficiencyLevel: 'expert' }] });
                      e.currentTarget.value = '';
                    }
                  }
                }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-brand-blue bg-brand-blue/10 px-2 py-1 rounded-lg">ENTER</span>
            </div>

            {(localData.skills || []).length > 0 && (
              <div className="space-y-3 mt-6 bg-surface-50 p-4 rounded-2xl border border-surface-200">
                <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest px-1">Active Skill Set</p>
                <div className="flex flex-wrap gap-2">
                  {localData.skills?.map((skill: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-surface-200 rounded-lg shadow-sm">
                      <span className="text-xs font-bold text-brand-dark">{skill.name}</span>
                      <button 
                        onClick={() => {
                          const newSkills = [...(localData.skills || [])];
                          newSkills.splice(idx, 1);
                          updateLocal({ skills: newSkills });
                        }}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'experience':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-1 px-1">
              <h2 className="text-2xl font-black text-brand-dark tracking-tight">Work History</h2>
              <p className="text-sm text-text-secondary font-medium">Add past jobs (if any).</p>
            </div>
            
            <div className="space-y-4">
              {(localData.workExperience || []).length === 0 ? (
                <button 
                  onClick={() => updateLocal({ 
                    workExperience: [{ jobTitle: '', company: '', startDate: new Date(), responsibilities: [] }]
                  })}
                  className="w-full py-12 border-2 border-dashed border-surface-200 rounded-[2rem] bg-surface-50/50 flex flex-col items-center gap-4 text-brand-dark hover:bg-surface-100 transition-all group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-surface-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Briefcase size={28} className="text-brand-dark" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-sm font-black uppercase tracking-widest text-brand-dark">Add Work Experience</p>
                    <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest opacity-60">Optional for first-time seekers</p>
                  </div>
                </button>
              ) : (
                <>
                  <div className="flex justify-end">
                    <button 
                      onClick={() => updateLocal({ 
                        workExperience: [...(localData.workExperience || []), { jobTitle: '', company: '', startDate: new Date(), responsibilities: [] }]
                      })}
                      className="bg-brand-dark text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95 transition-all"
                    >
                      <Plus size={14} strokeWidth={3} /> Add Another Job
                    </button>
                  </div>
                  {localData.workExperience?.map((exp: any, idx: number) => (
                    <div key={idx} className="p-5 bg-white border border-surface-200 rounded-[2rem] space-y-4 shadow-sm relative group">
                      <div className="flex justify-between items-center border-b border-surface-50 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue text-[10px] font-black">{idx + 1}</div>
                          <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Entry Node</h3>
                        </div>
                        <button 
                          onClick={() => {
                            const newExp = [...(localData.workExperience || [])];
                            newExp.splice(idx, 1);
                            updateLocal({ workExperience: newExp });
                          }}
                          className="text-red-400 hover:text-red-600 p-1 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="space-y-4">
                        <InputGroup label="Job Role">
                          <input 
                            placeholder="e.g. General Worker" 
                            className="input-minimal"
                            value={exp.jobTitle}
                            onChange={e => {
                              const newExp = [...(localData.workExperience || [])];
                              newExp[idx].jobTitle = e.target.value;
                              updateLocal({ workExperience: newExp });
                            }}
                          />
                        </InputGroup>
                        <InputGroup label="Company Name">
                          <input 
                            placeholder="Company or Employer" 
                            className="input-minimal"
                            value={exp.company}
                            onChange={e => {
                              const newExp = [...(localData.workExperience || [])];
                              newExp[idx].company = e.target.value;
                              updateLocal({ workExperience: newExp });
                            }}
                          />
                        </InputGroup>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <InputGroup label="Start Date">
                            <div className="relative">
                              <input 
                                type="date"
                                className="input-minimal date-input-custom"
                                value={exp.startDate ? new Date(exp.startDate).toISOString().split('T')[0] : ''}
                                onChange={e => {
                                  const newExp = [...(localData.workExperience || [])];
                                  newExp[idx].startDate = e.target.value; // Store as YYYY-MM-DD string
                                  updateLocal({ workExperience: newExp });
                                }}
                              />
                            </div>
                          </InputGroup>
                          <InputGroup label="End Date (Leave empty if current)">
                            <div className="relative">
                              <input 
                                type="date"
                                className="input-minimal date-input-custom"
                                value={exp.endDate ? new Date(exp.endDate).toISOString().split('T')[0] : ''}
                                onChange={e => {
                                  const newExp = [...(localData.workExperience || [])];
                                  newExp[idx].endDate = e.target.value;
                                  newExp[idx].isCurrentJob = !e.target.value; // Auto-set isCurrent if empty
                                  updateLocal({ workExperience: newExp });
                                }}
                              />
                            </div>
                          </InputGroup>
                        </div>

                        <InputGroup label="What did you do?">
                          <textarea 
                            placeholder="Briefly describe your tasks" 
                            className="input-minimal h-24 pt-3 resize-none"
                            value={exp.responsibilities?.[0] || ''} 
                            onChange={e => {
                              const newExp = [...(localData.workExperience || [])];
                              newExp[idx].responsibilities = [e.target.value];
                              updateLocal({ workExperience: newExp });
                            }}
                          />
                        </InputGroup>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        );

      case 'references':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-1 px-1">
              <h2 className="text-2xl font-black text-brand-dark tracking-tight">References</h2>
              <p className="text-sm text-text-secondary font-medium">People who speak for you.</p>
            </div>
            
            <div className="space-y-4">
              {(localData.references || []).length === 0 ? (
                <button 
                  onClick={() => updateLocal({ 
                    references: [{ name: '', relationship: '', phone: '', company: 'Reference', title: 'Reference', email: '' }]
                  })}
                  className="w-full py-12 border-2 border-dashed border-surface-200 rounded-[2rem] bg-surface-50/50 flex flex-col items-center gap-4 text-brand-dark hover:bg-surface-100 transition-all group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-surface-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CheckCircle2 size={28} className="text-brand-dark" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-sm font-black uppercase tracking-widest text-brand-dark">Add Professional Reference</p>
                    <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest opacity-60">Pastor, Teacher, or Previous Boss</p>
                  </div>
                </button>
              ) : (
                <>
                  <div className="flex justify-end">
                    <button 
                      onClick={() => updateLocal({ 
                        references: [...(localData.references || []), { name: '', relationship: '', phone: '', company: 'Reference', title: 'Reference', email: '' }]
                      })}
                      className="bg-brand-dark text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95 transition-all"
                    >
                      <Plus size={14} strokeWidth={3} /> Add Another
                    </button>
                  </div>
                  {localData.references?.map((ref: any, idx: number) => (
                    <div key={idx} className="p-5 bg-white border border-surface-200 rounded-[2rem] space-y-4 shadow-sm relative">
                      <div className="flex justify-between items-center border-b border-surface-50 pb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-brand-success/10 flex items-center justify-center text-brand-success text-[10px] font-black">{idx + 1}</div>
                            <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Trust Contact</h3>
                          </div>
                          <button 
                            onClick={() => {
                              const newRef = [...(localData.references || [])];
                              newRef.splice(idx, 1);
                              updateLocal({ references: newRef });
                            }}
                            className="text-red-400 hover:text-red-600 p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      <div className="space-y-4">
                        <InputGroup label="Reference Name">
                          <input 
                            placeholder="e.g. Mr. Khumalo" 
                            className="input-minimal"
                            value={ref.name}
                            onChange={e => {
                              const newRef = [...(localData.references || [])];
                              newRef[idx].name = e.target.value;
                              updateLocal({ references: newRef });
                            }}
                          />
                        </InputGroup>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <InputGroup label="Job Title / Position">
                            <input 
                              placeholder="e.g. Principal" 
                              className="input-minimal"
                              value={ref.title}
                              onChange={e => {
                                const newRef = [...(localData.references || [])];
                                newRef[idx].title = e.target.value;
                                updateLocal({ references: newRef });
                              }}
                            />
                          </InputGroup>
                          <InputGroup label="Company / Institution">
                            <input 
                              placeholder="e.g. Orlando High School" 
                              className="input-minimal"
                              value={ref.company}
                              onChange={e => {
                                const newRef = [...(localData.references || [])];
                                newRef[idx].company = e.target.value;
                                updateLocal({ references: newRef });
                              }}
                            />
                          </InputGroup>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <InputGroup label="Relationship">
                            <input 
                              placeholder="e.g. Former Supervisor" 
                              className="input-minimal"
                              value={ref.relationship}
                              onChange={e => {
                                const newRef = [...(localData.references || [])];
                                newRef[idx].relationship = e.target.value;
                                updateLocal({ references: newRef });
                              }}
                            />
                          </InputGroup>
                          <InputGroup label="Their Phone">
                            <PhoneInput
                              value={ref.phone}
                              onChange={(val) => {
                                const newRef = [...(localData.references || [])];
                                newRef[idx].phone = val;
                                updateLocal({ references: newRef });
                              }}
                              placeholder="Phone number"
                            />
                          </InputGroup>
                        </div>
                        <InputGroup label="Their Email (Optional)">
                          <input 
                            placeholder="email@example.com" 
                            className="input-minimal"
                            type="email"
                            value={ref.email}
                            onChange={e => {
                              const newRef = [...(localData.references || [])];
                              newRef[idx].email = e.target.value;
                              updateLocal({ references: newRef });
                            }}
                          />
                        </InputGroup>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 text-center animate-in fade-in zoom-in-95 duration-700">
            <div className="relative">
              <div className="absolute inset-0 bg-brand-success/20 blur-2xl rounded-full" />
              <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center shadow-2xl relative z-10 border border-surface-100">
                <Sparkles size={40} className="text-brand-success" />
              </div>
            </div>
            <div className="space-y-2 max-w-xs mx-auto">
              <h2 className="text-3xl font-black text-brand-dark tracking-tight leading-none">Ready to Launch.</h2>
              <p className="text-text-secondary text-sm font-medium">Our AI is ready to polish your architecture for professional deployment.</p>
            </div>
            
            <div className="space-y-4 w-full max-w-sm px-4 pt-4">
              <button 
                onClick={generateAIProfile}
                disabled={loadingAI}
                className="w-full py-5 bg-brand-purple text-white rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-brand-purple/30 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {loadingAI ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Optimizing...</span>
                  </div>
                ) : <><Sparkles size={20} strokeWidth={2.5} /> AI Auto-Polish</>}
              </button>

              <button 
                onClick={async () => {
                  const savedId = await handleSave();
                  if (savedId) {
                    clearStorage(); // Clear local draft once persisted
                    setTimeout(() => navigate(`/dashboard/resume/preview/${savedId}?template=basic_sa`, { 
                      state: { 
                        resumeData: localData,
                        refresh: true // Force regeneration
                      } 
                    }), 100);
                  }
                }}
                className="w-full py-5 bg-white text-brand-blue border-2 border-brand-blue/10 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-brand-blue/5 transition-all active:scale-95 shadow-sm"
              >
                Generate PDF
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-brand-dark overflow-hidden">
      <div className="flex-1 w-full h-screen md:grid md:grid-cols-[300px_1fr] transition-all duration-500 overflow-hidden">
        
        {/* Desktop Sidebar */}
        <div className="hidden md:flex flex-col bg-[#f8fafc] p-10 justify-between relative overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40">
            <div className="absolute -top-[20%] -left-[20%] w-[140%] h-[60%] bg-gradient-to-br from-brand-blue/10 to-transparent rounded-full blur-3xl" />
          </div>

          <div className="space-y-8 relative z-10">
            <div className="space-y-1">
              <h1 className="text-xl font-black text-brand-dark tracking-tight">Resume<span className="text-brand-blue">Suite</span></h1>
              <p className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Builder v2.0</p>
            </div>

            <div className="space-y-2">
              {STEPS.map((step, idx) => {
                const isActive = idx === currentStep;
                const isCompleted = idx < currentStep;
                const Icon = step.icon;

                return (
                  <button 
                    key={step.id}
                    onClick={() => {
                      if (isCompleted) {
                        syncToContext();
                        setCurrentStep(idx);
                      }
                    }}
                    disabled={!isCompleted && !isActive}
                    className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-300 text-left group ${
                      isActive 
                        ? 'bg-white shadow-lg shadow-brand-dark/5 ring-1 ring-black/5' 
                        : isCompleted 
                          ? 'hover:bg-white/50 text-text-secondary cursor-pointer' 
                          : 'opacity-40 cursor-not-allowed text-text-tertiary'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
                      isActive 
                        ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/30 scale-110' 
                        : isCompleted
                          ? 'bg-brand-success/10 text-brand-success'
                          : 'bg-surface-200 text-text-tertiary'
                    }`}>
                      {isCompleted ? <CheckCircle2 size={18} strokeWidth={3} /> : <Icon size={18} />}
                    </div>
                    <div>
                      <p className={`text-xs font-black uppercase tracking-wider ${isActive ? 'text-brand-dark' : 'text-text-secondary'}`}>
                        {step.title}
                      </p>
                      {isActive && <p className="text-[10px] font-bold text-brand-blue animate-pulse">In Progress</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative z-10">
             <div className="p-4 bg-brand-dark/5 rounded-2xl border border-brand-dark/5">
                <p className="text-[10px] text-text-secondary font-medium leading-relaxed">
                  "Excellence is not a skill, it's an attitude."
                </p>
             </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex flex-col h-full relative bg-white">
          
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="md:hidden px-6 py-5 flex items-center gap-4 bg-white/95 backdrop-blur-md sticky top-0 z-20">
            <button onClick={handleBack} className="w-10 h-10 rounded-full hover:bg-surface-50 flex items-center justify-center text-brand-dark active:scale-90 transition-all">
              <ArrowLeft size={24} strokeWidth={2.5} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h1 className="text-sm font-black text-brand-dark uppercase tracking-widest truncate">{STEPS[currentStep].title}</h1>
                <span className="text-[10px] font-black text-brand-blue bg-brand-blue/5 px-2.5 py-1 rounded-lg border border-brand-blue/10">
                  {currentStep + 1} OF {STEPS.length}
                </span>
              </div>
              <div className="h-1.5 bg-surface-100 w-full mt-3 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-brand-blue rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                />
              </div>
            </div>
          </div>

          {/* Desktop Header Content */}
          <div className="hidden md:flex items-center justify-between px-10 py-8 pb-4">
             <div>
                <h2 className="text-3xl font-black text-brand-dark tracking-tight">{STEPS[currentStep].title}</h2>
                <p className="text-sm font-medium text-text-secondary mt-1">Please fill in the details below carefully.</p>
             </div>
             <div className="flex items-center gap-3">
                <button 
                   onClick={async () => {
                     await handleSave();
                     clearStorage(); // Clear local draft once persisted
                     navigate('/dashboard/resume');
                   }}
                   className="px-4 py-2 text-xs font-black text-text-tertiary uppercase tracking-widest hover:text-brand-dark transition-colors"
                >
                  Save & Exit
                </button>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:px-16 md:py-10 relative pb-44 md:pb-40">
            {renderStep()}
          </div>

          {/* Bottom Action Bar */}
          {STEPS[currentStep].id !== 'review' && (
            <div className="p-6 md:px-16 md:py-10 bg-white/95 backdrop-blur-xl absolute bottom-0 left-0 right-0 z-30 safe-area-bottom shadow-[0_-20px_50px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between gap-4">
                 <button
                    onClick={handleBack}
                    className="hidden md:flex px-6 py-4 rounded-xl text-xs font-black uppercase tracking-widest text-text-secondary hover:bg-surface-50 transition-all"
                 >
                    Back
                 </button>
                 
                 <button 
                  onClick={handleNext}
                  className="flex-1 md:flex-none md:w-auto md:px-10 py-5 bg-brand-dark text-white rounded-xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-brand-dark/20 active:scale-[0.96] transition-all flex items-center justify-center gap-3 hover:bg-brand-dark/90"
                >
                  Next Step <ChevronRight size={18} strokeWidth={3} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        .input-minimal {
          width: 100%;
          padding: 1rem 1.25rem;
          border-radius: 1.25rem;
          font-size: 1rem;
          font-weight: 600;
          color: #0f172a;
          background-color: #f8fafc;
          border: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
          min-height: 56px;
        }
        .input-minimal:focus {
          background-color: white;
          box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.1), 0 8px 10px -6px rgba(59, 130, 246, 0.1);
          transform: translateY(-1px);
        }
        .input-minimal::placeholder {
          color: #94a3b8;
          font-weight: 500;
          opacity: 0.7;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        @supports(padding: env(safe-area-inset-bottom)) {
          .safe-area-bottom {
            padding-bottom: calc(1.5rem + env(safe-area-inset-bottom));
          }
        }
        .py-5\\.5 {
          padding-top: 1.375rem;
          padding-bottom: 1.375rem;
        }
        .date-input-custom {
          appearance: none;
          -webkit-appearance: none;
          position: relative;
          background-color: #f8fafc;
        }
        .date-input-custom::-webkit-calendar-picker-indicator {
          color: #1e293b;
          opacity: 0.5;
          cursor: pointer;
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          padding: 0;
        }
        .date-input-custom:focus::-webkit-calendar-picker-indicator {
          opacity: 1;
        }
      `}</style>
    </div>
  );
};

const BasicResumeBuilder = () => {
  const location = useLocation();
  const initialData = location.state?.resumeData;
  const templateId = 'basic_sa';
  
  return (
    <ResumeProvider initialData={{ ...initialData, template: templateId }}>
      <BasicResumeBuilderContent />
    </ResumeProvider>
  );
};

export default BasicResumeBuilder;