import React from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { Input } from '../ui/Input';
import { UserIcon, LinkIcon } from '@heroicons/react/24/outline';

export function PersonalInfoForm() {
  const { resumeData, handleDataChange } = useResume();
  const { personalInfo } = resumeData;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Functional update logic similar to the one added to Basic Builder
    handleDataChange('personal-info', { 
      ...(personalInfo || {}), 
      [name]: value 
    });
  };

  return (
    <div className="space-y-4 md:space-y-10 animate-slide-up-soft">
      <div className="space-y-1 md:space-y-2">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-sm">
            <UserIcon className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <h2 className="text-xl md:text-2xl font-black text-brand-dark tracking-tight leading-none uppercase">Identity Base.</h2>
        </div>
        <p className="text-xs md:text-sm font-bold text-text-secondary opacity-70 ml-1">
          Configure your primary contact parameters and professional identifier.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
        <Input
          label="Legal First Name"
          name="firstName"
          value={personalInfo?.firstName || ''}
          onChange={handleChange}
          required
          placeholder="e.g. John"
        />
        <Input
          label="Legal Last Name (Surname)"
          name="lastName"
          value={personalInfo?.lastName || ''}
          onChange={handleChange}
          required
          placeholder="e.g. Doe"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
        <Input
          label="Identity Number"
          name="identityNumber"
          value={personalInfo?.identityNumber || ''}
          onChange={handleChange}
          required
          placeholder="13-digit ID"
          maxLength={13}
        />
        <Input
          label="Date of Birth"
          name="dateOfBirth"
          value={personalInfo?.dateOfBirth || ''}
          onChange={handleChange}
          required
          placeholder="e.g. 18 October 1991"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
        <Input
          label="Gender"
          name="gender"
          value={personalInfo?.gender || ''}
          onChange={handleChange}
          required
          placeholder="e.g. Female"
        />
        <Input
          label="Nationality"
          name="nationality"
          value={personalInfo?.nationality || ''}
          onChange={handleChange}
          required
          placeholder="e.g. South African"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
        <Input
          label="Marital Status"
          name="maritalStatus"
          value={personalInfo?.maritalStatus || ''}
          onChange={handleChange}
          required
          placeholder="e.g. Single"
        />
        <Input
          label="Home Language"
          name="homeLanguage"
          value={personalInfo?.homeLanguage || ''}
          onChange={handleChange}
          required
          placeholder="e.g. IsiXhosa"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
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

      <div className="space-y-1.5">
        <label className="text-sm font-black text-brand-dark uppercase tracking-widest pl-1">Residential Address</label>
        <textarea
          name="residentialAddress"
          value={personalInfo?.residentialAddress || ''}
          onChange={handleChange}
          required
          placeholder="Street, Suburb, City, Code"
          className="w-full px-5 py-4 rounded-xl border-2 border-surface-200 bg-surface-50 focus:border-brand-blue focus:bg-white transition-all outline-none text-brand-dark font-bold min-h-[100px] resize-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 pt-4">
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

      <div className="pt-6 md:pt-10 border-t border-surface-100">
        <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-8">
          <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-surface-50 border border-surface-200 flex items-center justify-center text-brand-blue shadow-inner">
            <LinkIcon className="w-3 h-3 md:w-4 md:h-4" />
          </div>
          <h3 className="text-xs md:text-sm font-black text-brand-dark uppercase tracking-widest">Network Links</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
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