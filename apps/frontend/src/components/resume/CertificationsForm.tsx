import React, { useState } from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { PlusIcon, TrashIcon, AcademicCapIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { DatePicker } from '../ui/DatePicker';
import { Certification } from '../../types';
import { validateUrl, validateDateRange } from '../../utils/formValidation';

export default function CertificationsForm() {
  const { resumeData, handleDataChange } = useResume();
  const { certifications } = resumeData;
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});

  const updateCertifications = (newCertifications: Certification[]) => {
    handleDataChange('certifications', newCertifications);
  };

  const handleCertificationChange = (index: number, field: keyof Certification, value: string) => {
    const updatedCertifications = [...(certifications || [])];
    updatedCertifications[index] = { ...updatedCertifications[index], [field]: value };
    updateCertifications(updatedCertifications);
    
    // Validate the field
    validateField(index, field, value, updatedCertifications[index]);
  };

  const validateField = (index: number, field: keyof Certification, value: string, certification: Certification) => {
    const certErrors = { ...errors[index] || {} };
    
    // Clear previous error
    delete certErrors[field];
    
    // Validate based on field
    switch (field) {
      case 'name':
        if (!value.trim()) {
          certErrors.name = 'Certification name is required';
        }
        break;
      case 'issuer':
        if (!value.trim()) {
          certErrors.issuer = 'Issuing organization is required';
        }
        break;
      case 'url':
        if (value && !validateUrl(value)) {
          certErrors.url = 'Please enter a valid URL';
        }
        break;
      case 'date':
      case 'expirationDate':
        if (certification.date && certification.expirationDate) {
          const dateErrors = validateDateRange(certification.date + '-01', certification.expirationDate + '-01');
          if (dateErrors.start) certErrors.date = 'Issue date cannot be after expiration';
          if (dateErrors.end) certErrors.expirationDate = 'Expiration date cannot be before issue date';
        }
        break;
    }
    
    setErrors(prev => ({
      ...prev,
      [index]: Object.keys(certErrors).length > 0 ? certErrors : {}
    }));
  };

  const getFieldError = (index: number, field: string): string | undefined => {
    return errors[index]?.[field];
  };

  const addCertification = () => {
    updateCertifications([
      ...(certifications || []),
      {
        id: Date.now().toString(),
        name: '',
        issuer: '',
        date: '',
        expirationDate: '',
        credentialId: '',
        url: ''
      }
    ]);
  };

  const removeCertification = (index: number) => {
    if (certifications && certifications.length > 1) {
      updateCertifications(certifications.filter((_, i) => i !== index));
    }
  };

  const popularCertifications = [
    'AWS Certified Solutions Architect',
    'Google Cloud Professional',
    'Microsoft Azure Fundamentals',
    'Certified Kubernetes Administrator',
    'PMP (Project Management Professional)',
    'Certified ScrumMaster (CSM)',
    'CompTIA Security+',
    'Cisco CCNA',
    'Salesforce Administrator',
    'Google Analytics Certified'
  ];

  return (
    <div className="space-y-6 animate-slide-up-soft">
      <div>
        <h2 className="text-2xl font-bold gradient-text-dark mb-2">Certifications</h2>
        <p className="text-dark-text-secondary">
          List your professional certifications, licenses, and credentials that demonstrate your expertise.
        </p>
      </div>

      {/* Popular Certifications */}
      <Card className="card-dark p-4">
        <h3 className="font-medium text-dark-text-primary mb-3 flex items-center">
          <AcademicCapIcon className="w-5 h-5 mr-2 text-dark-accent" />
          Popular Certifications
        </h3>
        <div className="flex flex-wrap gap-2">
          {popularCertifications.map((cert) => (
            <button
              key={cert}
              onClick={() => {
                const emptyIndex = certifications?.findIndex(c => !c.name) ?? -1;
                if (emptyIndex !== -1) {
                  handleCertificationChange(emptyIndex, 'name', cert);
                } else {
                  addCertification();
                  const newIndex = (certifications || []).length;
                  handleCertificationChange(newIndex, 'name', cert);
                }
              }}
              className="text-sm bg-gray-800/20 text-dark-accent px-3 py-1 rounded-full hover:bg-gray-800/30 transition-colors border border-dark-border"
            >
              + {cert}
            </button>
          ))}
        </div>
      </Card>

      <div className="space-y-6">
        {(certifications || []).map((certification, index) => (
          <Card key={certification.id || index} className="card-dark p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-dark-text-primary">
                Certification {index + 1}
              </h3>
              {certifications && certifications.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeCertification(index)}
                  className="accent-danger hover:bg-gray-900/20"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <Input
                label="Certification Name"
                value={certification.name}
                onChange={(e) => handleCertificationChange(index, 'name', e.target.value)}
                placeholder="e.g., AWS Certified Solutions Architect"
                required
                error={getFieldError(index, 'name')}
              />
              
              <Input
                label="Issuing Organization"
                value={certification.issuer}
                onChange={(e) => handleCertificationChange(index, 'issuer', e.target.value)}
                placeholder="e.g., Amazon Web Services"
                required
                error={getFieldError(index, 'issuer')}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <DatePicker
                label="Issue Date"
                value={certification.date}
                onChange={(value) => handleCertificationChange(index, 'date', value)}
                allowFuture={false}
                helpText="When you received this certification"
                error={getFieldError(index, 'date')}
              />
              
              <DatePicker
                label="Expiration Date"
                value={certification.expirationDate || ''}
                onChange={(value) => handleCertificationChange(index, 'expirationDate', value)}
                allowFuture={true}
                helpText="When this certification expires (if applicable)"
                error={getFieldError(index, 'expirationDate')}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Credential ID"
                value={certification.credentialId || ''}
                onChange={(e) => handleCertificationChange(index, 'credentialId', e.target.value)}
                placeholder="e.g., AWS-ASA-12345"
                helpText="Unique identifier for verification (optional)"
              />
              
              <Input
                label="Credential URL"
                value={certification.url || ''}
                onChange={(e) => handleCertificationChange(index, 'url', e.target.value)}
                placeholder="https://verify.example.com/cert/12345"
                type="url"
                helpText="Link to verify this certification (optional)"
                error={getFieldError(index, 'url')}
              />
            </div>
          </Card>
        ))}
      </div>

      <Button
        variant="outline"
        onClick={addCertification}
        className="btn-secondary-dark w-full"
      >
        <PlusIcon className="w-4 h-4 mr-2" />
        Add Another Certification
      </Button>

      <div className="glass-dark p-4 rounded-lg border border-dark-border">
        <h4 className="font-medium text-dark-accent mb-2">🎯 Certification Tips</h4>
        <ul className="text-sm text-dark-text-secondary space-y-1">
          <li>• Include only relevant certifications for your target role</li>
          <li>• List current/active certifications first</li>
          <li>• Include credential IDs and verification links when available</li>
          <li>• Consider industry-standard certifications for your field</li>
          <li>• Remove expired certifications unless they demonstrate long-term expertise</li>
        </ul>
      </div>
    </div>
  );
}