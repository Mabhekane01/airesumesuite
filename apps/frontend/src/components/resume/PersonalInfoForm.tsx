import React from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { Input } from '../ui/Input';

export function PersonalInfoForm() {
  const { resumeData, handleDataChange } = useResume();
  const { personalInfo } = resumeData;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    handleDataChange('personal-info', { ...personalInfo, [name]: value });
  };

  return (
    <div className="space-y-6 animate-slide-up-soft">
      <div>
        <h2 className="text-xl font-semibold gradient-text-dark mb-4">Personal Information</h2>
        <p className="text-dark-text-secondary mb-6">
          Let's start with your basic contact information. This will appear at the top of your resume.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Input
          label="First Name"
          name="firstName"
          value={personalInfo?.firstName || ''}
          onChange={handleChange}
          required
        />
        <Input
          label="Last Name"
          name="lastName"
          value={personalInfo?.lastName || ''}
          onChange={handleChange}
          required
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Input
          label="Email Address"
          type="email"
          name="email"
          value={personalInfo?.email || ''}
          onChange={handleChange}
          required
        />
        <Input
          label="Phone Number"
          name="phone"
          value={personalInfo?.phone || ''}
          onChange={handleChange}
          required
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Input
          label="Location"
          placeholder="City, State"
          name="location"
          value={personalInfo?.location || ''}
          onChange={handleChange}
          required
        />
        <Input
          label="Professional Title (Optional)"
          placeholder="Software Engineer, Marketing Manager, etc."
          name="professionalTitle"
          value={personalInfo?.professionalTitle || ''}
          onChange={handleChange}
        />
      </div>

      <div className="border-t border-dark-border pt-6">
        <h3 className="text-lg font-medium text-dark-text-primary mb-4">Optional Links</h3>
        
        <div className="space-y-4">
          <Input
            label="LinkedIn URL"
            placeholder="https://linkedin.com/in/your-profile"
            name="linkedinUrl"
            value={personalInfo?.linkedinUrl || ''}
            onChange={handleChange}
          />
          <Input
            label="Portfolio Website"
            placeholder="https://your-portfolio.com"
            name="portfolioUrl"
            value={personalInfo?.portfolioUrl || ''}
            onChange={handleChange}
          />
          <Input
            label="GitHub URL"
            placeholder="https://github.com/your-username"
            name="githubUrl"
            value={personalInfo?.githubUrl || ''}
            onChange={handleChange}
          />
          <Input
            label="Personal Website"
            placeholder="https://your-website.com"
            name="websiteUrl"
            value={personalInfo?.websiteUrl || ''}
            onChange={handleChange}
          />
        </div>
      </div>
    </div>
  );
}