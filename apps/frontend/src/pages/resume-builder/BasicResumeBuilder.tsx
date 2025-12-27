import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, ChevronRight, Trash2, Plus, GraduationCap, Briefcase, User, Star, CheckCircle2 } from 'lucide-react';
import { ResumeProvider, useResume } from '../../contexts/ResumeContext';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { MultiSelectSubjects } from '../../components/ui/MultiSelectSubjects';

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

const BasicResumeBuilderContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { resumeData, updateResumeData, saveToStorage } = useResume();
  const [currentStep, setCurrentStep] = useState(0);
  const [loadingAI, setLoadingAI] = useState(false);
  
  // Local state for performant typing and robust updates
  const [localData, setLocalData] = useState<any>(null);
  const isInitialMount = useRef(true);

  // Initialize localData from resumeData
  useEffect(() => {
    if (isInitialMount.current && Object.keys(resumeData).length > 0) {
      const data = JSON.parse(JSON.stringify(resumeData));
      
      // Ensure personalInfo exists and has default nationality if it's a SA template
      if (!data.personalInfo) data.personalInfo = {};
      if (!data.personalInfo.nationality && (data.targetLocation === 'South Africa' || data.templateId === 'basic_sa')) {
        data.personalInfo.nationality = 'South African';
      }
      
      // Ensure professionalSummary exists
      if (data.professionalSummary === undefined) data.professionalSummary = '';
      
      setLocalData(data);
      isInitialMount.current = false;
    }
  }, [resumeData]);

  // Load existing resume from API if ID is present and not 'new'
  useEffect(() => {
    const fetchResume = async () => {
      if (id && id !== 'new') {
        try {
          const response = await api.get(`/resumes/${id}`);
          if (response.data.success) {
            updateResumeData(response.data.data);
            setLocalData(response.data.data);
          }
        } catch (error) {
          toast.error('Failed to load resume');
          navigate('/dashboard/resume');
        }
      }
    };
    if (id) fetchResume();
  }, [id]);

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
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-1 px-1">
              <h2 className="text-2xl font-black text-brand-dark tracking-tight">Personal Details</h2>
              <p className="text-sm text-text-secondary font-medium">Standard South African CV Information</p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
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
                  <input 
                    className="input-minimal"
                    placeholder="e.g. 18 October 1991"
                    value={localData.personalInfo?.dateOfBirth || ''}
                    onChange={e => updatePersonalInfo('dateOfBirth', e.target.value)}
                  />
                </InputGroup>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                  <input 
                    className="input-minimal"
                    placeholder="e.g. South African"
                    value={localData.personalInfo?.nationality || ''}
                    onChange={e => updatePersonalInfo('nationality', e.target.value)}
                  />
                </InputGroup>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                  <input 
                    className="input-minimal"
                    placeholder="e.g. IsiXhosa"
                    value={localData.personalInfo?.homeLanguage || ''}
                    onChange={e => updatePersonalInfo('homeLanguage', e.target.value)}
                  />
                </InputGroup>
              </div>

              <InputGroup label="Other Languages">
                <input 
                  className="input-minimal"
                  placeholder="e.g. English, IsiZulu"
                  value={localData.personalInfo?.otherLanguages || ''}
                  onChange={e => updatePersonalInfo('otherLanguages', e.target.value)}
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

              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Contact Number">
                  <input 
                    className="input-minimal"
                    placeholder="e.g. 083 564 1419"
                    type="tel"
                    value={localData.personalInfo?.phone || ''}
                    onChange={e => updatePersonalInfo('phone', e.target.value)}
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
              
              <div className="grid grid-cols-2 gap-4">
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
                        <div className="grid grid-cols-2 gap-4">
                          <InputGroup label="Who is this?">
                            <input 
                              placeholder="e.g. Pastor / Boss" 
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
                            <input 
                              placeholder="Phone number" 
                              className="input-minimal"
                              type="tel"
                              value={ref.phone}
                              onChange={e => {
                                const newRef = [...(localData.references || [])];
                                newRef[idx].phone = e.target.value;
                                updateLocal({ references: newRef });
                              }}
                            />
                          </InputGroup>
                        </div>
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
                onClick={() => {
                  syncToContext();
                  setTimeout(() => navigate(`/dashboard/resume/preview/${localData._id || 'new'}?template=basic_sa`, { 
                    state: { resumeData: localData } 
                  }), 100);
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
    <div className="min-h-screen bg-white md:bg-surface-50 flex flex-col font-sans">
      <div className="flex-1 w-full max-w-lg mx-auto md:bg-white md:rounded-[3rem] md:shadow-2xl flex flex-col md:my-8 md:h-[850px] md:relative md:overflow-hidden border-surface-100">
        
        {/* Modern Header */}
        <div className="px-6 py-5 border-b border-surface-100 flex items-center gap-4 bg-white/95 backdrop-blur-md sticky top-0 z-20">
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

        {/* Dynamic Navigation Dots (Visual Indicator) */}
        <div className="flex justify-center gap-1.5 py-3 bg-surface-50/30 md:hidden">
          {STEPS.map((_, idx) => (
            <div key={idx} className={`h-1 rounded-full transition-all duration-500 ${idx === currentStep ? 'w-6 bg-brand-blue' : 'w-1 bg-surface-200'}`} />
          ))}
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 relative pb-44 md:pb-32 bg-white">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="h-full"
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Floating Action Bar */}
        {STEPS[currentStep].id !== 'review' && (
          <div className="p-6 bg-white/95 backdrop-blur-xl border-t border-surface-100 fixed md:absolute bottom-0 left-0 right-0 z-30 safe-area-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.06)]">
            <div className="max-w-lg mx-auto">
              <button 
                onClick={handleNext}
                className="w-full py-5.5 md:py-5 bg-brand-dark text-white rounded-[1.5rem] font-black text-sm md:text-base uppercase tracking-[0.2em] shadow-2xl shadow-brand-dark/30 active:scale-[0.96] transition-all flex items-center justify-center gap-3"
              >
                Next Node <ChevronRight size={20} strokeWidth={3} />
              </button>
            </div>
          </div>
        )}
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
          border: 2px solid #f1f5f9;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
          min-height: 56px;
        }
        .input-minimal:focus {
          background-color: white;
          border-color: #3b82f6;
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