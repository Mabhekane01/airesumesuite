import React, { useState } from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { PlusIcon, TrashIcon, AcademicCapIcon, ShieldCheckIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Input } from '../ui/Input';
import { DatePicker } from '../ui/DatePicker';
import { Certification } from '../../types';
import { validateUrl, validateDateRange } from '../../utils/formValidation';
import { motion, AnimatePresence } from 'framer-motion';

export default function CertificationsForm() {
  const { resumeData, handleDataChange } = useResume();
  const { certifications } = resumeData;
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});

  const updateCertifications = (newCertifications: Certification[]) => handleDataChange('certifications', newCertifications);

  const handleCertificationChange = (index: number, field: keyof Certification, value: string) => {
    const updatedCertifications = [...(certifications || [])];
    updatedCertifications[index] = { ...updatedCertifications[index], [field]: value };
    updateCertifications(updatedCertifications);
    validateField(index, field, value, updatedCertifications[index]);
  };

  const validateField = (index: number, field: keyof Certification, value: string, certification: Certification) => {
    const certErrors = { ...errors[index] || {} };
    delete certErrors[field];
    
    switch (field) {
      case 'name': if (!value.trim()) certErrors.name = 'Certification name required'; break;
      case 'issuer': if (!value.trim()) certErrors.issuer = 'Issuing organization required'; break;
      case 'url': if (value && !validateUrl(value)) certErrors.url = 'Invalid URL protocol'; break;
      case 'date':
      case 'expirationDate':
        if (certification.date && certification.expirationDate) {
          const dateErrors = validateDateRange(certification.date + '-01', certification.expirationDate + '-01');
          if (dateErrors.start) certErrors.date = 'Initialization must precede expiration';
        }
        break;
    }
    setErrors(prev => ({ ...prev, [index]: certErrors }));
  };

  const addCertification = () => {
    updateCertifications([...(certifications || []), { id: Date.now().toString(), name: '', issuer: '', date: '', expirationDate: '', credentialId: '', url: '' }]);
  };

  const removeCertification = (index: number) => {
    if (certifications && certifications.length > 1) updateCertifications(certifications.filter((_, i) => i !== index));
  };

  const popularCertifications = ['AWS Solutions Architect', 'Google Cloud Professional', 'Azure Fundamentals', 'PMP', 'CompTIA Security+', 'Cisco CCNA'];

  return (
    <div className="space-y-10 animate-slide-up-soft">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-sm">
            <ShieldCheckIcon className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-brand-dark tracking-tight leading-none uppercase">Validations.</h2>
        </div>
        <p className="text-sm font-bold text-text-secondary opacity-70 ml-1">
          Professional credentials, licenses, and verified institutional benchmarks.
        </p>
      </div>

      {/* Suggested Nodes */}
      <div className="bg-white border border-surface-200 p-8 rounded-[2.5rem] shadow-sm">
        <h3 className="text-[10px] font-black text-brand-dark uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
          <AcademicCapIcon className="w-4 h-4 text-brand-blue" />
          Priority Architectures
        </h3>
        <div className="flex flex-wrap gap-2">
          {popularCertifications.map((cert) => (
            <button
              key={cert}
              onClick={() => {
                const emptyIdx = certifications?.findIndex(c => !c.name) ?? -1;
                if (emptyIdx !== -1) handleCertificationChange(emptyIdx, 'name', cert);
                else {
                  addCertification();
                  setTimeout(() => handleCertificationChange((certifications || []).length, 'name', cert), 0);
                }
              }}
              className="px-4 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-text-secondary hover:text-brand-blue hover:border-brand-blue/30 transition-all shadow-sm"
            >
              + {cert}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-8">
        <AnimatePresence mode="popLayout">
          {(certifications || []).map((certification, index) => (
            <motion.div 
              key={certification.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-8 bg-white border border-surface-200 rounded-[2.5rem] shadow-sm relative overflow-hidden group hover:border-brand-blue/30 transition-all duration-500"
            >
              <div className="absolute top-0 right-0 p-6 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity text-8xl font-black text-brand-dark">
                0{index + 1}
              </div>

              <div className="relative z-10 space-y-8">
                <div className="grid md:grid-cols-2 gap-6">
                  <Input
                    label="Credential Identifier"
                    value={certification.name}
                    onChange={(e) => handleCertificationChange(index, 'name', e.target.value)}
                    placeholder="e.g. AWS Solutions Architect"
                    required
                    error={errors[index]?.name}
                  />
                  <Input
                    label="Issuing Institution"
                    value={certification.issuer}
                    onChange={(e) => handleCertificationChange(index, 'issuer', e.target.value)}
                    placeholder="e.g. Amazon Web Services"
                    required
                    error={errors[index]?.issuer}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-surface-100">
                  <DatePicker
                    label="Verification Date"
                    value={certification.date}
                    onChange={(value) => handleCertificationChange(index, 'date', value)}
                    error={errors[index]?.date}
                  />
                  <DatePicker
                    label="Termination Date"
                    value={certification.expirationDate || ''}
                    onChange={(value) => handleCertificationChange(index, 'expirationDate', value)}
                    error={errors[index]?.expirationDate}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-surface-100">
                  <Input
                    label="Certificate Serial"
                    value={certification.credentialId || ''}
                    onChange={(e) => handleCertificationChange(index, 'credentialId', e.target.value)}
                    placeholder="e.g. VERIFY-123456"
                  />
                  <Input
                    label="Verification Node (URL)"
                    value={certification.url || ''}
                    onChange={(e) => handleCertificationChange(index, 'url', e.target.value)}
                    placeholder="https://verify.io/node"
                    type="url"
                    error={errors[index]?.url}
                  />
                </div>

                {certifications.length > 1 && (
                  <div className="flex justify-end pt-6 border-t border-surface-100">
                    <button 
                      onClick={() => removeCertification(index)} 
                      className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Purge Validation
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <button
        onClick={addCertification}
        className="w-full py-6 border-2 border-dashed border-surface-200 rounded-[2rem] text-text-tertiary hover:text-brand-blue hover:border-brand-blue/30 hover:bg-white transition-all flex flex-col items-center justify-center gap-2 group shadow-sm"
      >
        <div className="w-10 h-10 rounded-xl bg-surface-50 flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition-all">
          <PlusIcon className="w-6 h-6 stroke-[3]" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Register New Verification Node</span>
      </button>
    </div>
  );
}