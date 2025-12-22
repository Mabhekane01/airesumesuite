import React from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { Input } from '../ui/Input';
import { UserIcon, LinkIcon } from '@heroicons/react/24/outline';

export function PersonalInfoForm() {
  const { resumeData, handleDataChange } = useResume();
  const { personalInfo } = resumeData;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    handleDataChange('personal-info', { ...(personalInfo || {}), [name]: value });
  };

  return (
    <div className="space-y-10 animate-slide-up-soft">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-sm">
            <UserIcon className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-brand-dark tracking-tight leading-none uppercase">Identity Base.</h2>
        </div>
        <p className="text-sm font-bold text-text-secondary opacity-70 ml-1">
          Configure your primary contact parameters and professional identifier.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Legal First Name"
          name="firstName"
          value={personalInfo?.firstName || ''}
          onChange={handleChange}
          required
          placeholder="e.g. John"
        />
        <Input
          label="Legal Last Name"
          name="lastName"
          value={personalInfo?.lastName || ''}
          onChange={handleChange}
          required
          placeholder="e.g. Doe"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Institutional Email"
          type="email"
          name="email"
          value={personalInfo?.email || ''}
          onChange={handleChange}
          required
          placeholder="name@organization.com"
          helpText="Primary contact endpoint"
        />
        <Input
          label="Terminal Phone"
          name="phone"
          value={personalInfo?.phone || ''}
          onChange={handleChange}
          required
          placeholder="+1 (555) 000-0000"
          helpText="Include global area codes"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Geographic Node"
          placeholder="City, Country"
          name="location"
          value={personalInfo?.location || ''}
          onChange={handleChange}
          required
          helpText="Current deployment location"
        />
        <Input
          label="Professional Title"
          placeholder="e.g. Principal Systems Architect"
          name="professionalTitle"
          value={personalInfo?.professionalTitle || ''}
          onChange={handleChange}
          helpText="Core role architecture"
        />
      </div>

      <div className="pt-10 border-t border-surface-100">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-lg bg-surface-50 border border-surface-200 flex items-center justify-center text-brand-blue shadow-inner">
            <LinkIcon className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-black text-brand-dark uppercase tracking-widest">Network Links</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="LinkedIn Profile"
            placeholder="linkedin.com/in/identifier"
            name="linkedinUrl"
            value={personalInfo?.linkedinUrl || ''}
            onChange={handleChange}
          />
          <Input
            label="Vector Portfolio"
            placeholder="portfolio.io"
            name="portfolioUrl"
            value={personalInfo?.portfolioUrl || ''}
            onChange={handleChange}
          />
          <Input
            label="GitHub Repository"
            placeholder="github.com/source"
            name="githubUrl"
            value={personalInfo?.githubUrl || ''}
            onChange={handleChange}
          />
          <Input
            label="Digital HQ (Website)"
            placeholder="personal-site.com"
            name="websiteUrl"
            value={personalInfo?.websiteUrl || ''}
            onChange={handleChange}
          />
        </div>
      </div>
    </div>
  );
}