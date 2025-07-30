import React from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { PlusIcon, TrashIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Certification } from '../../types';

export default function CertificationsForm() {
  const { resumeData, handleDataChange } = useResume();
  const { certifications } = resumeData;

  const updateCertifications = (newCertifications: Certification[]) => {
    handleDataChange('certifications', newCertifications);
  };

  const handleCertificationChange = (index: number, field: keyof Certification, value: string) => {
    const updatedCertifications = [...(certifications || [])];
    updatedCertifications[index] = { ...updatedCertifications[index], [field]: value };
    updateCertifications(updatedCertifications);
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
              className="text-sm bg-dark-secondary/20 text-dark-accent px-3 py-1 rounded-full hover:bg-dark-secondary/30 transition-colors border border-dark-border"
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
                  className="accent-danger hover:bg-dark-primary/20"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <Input
                label="Certification Name *"
                value={certification.name}
                onChange={(e) => handleCertificationChange(index, 'name', e.target.value)}
                placeholder="e.g., AWS Certified Solutions Architect"
                required
              />
              
              <Input
                label="Issuing Organization *"
                value={certification.issuer}
                onChange={(e) => handleCertificationChange(index, 'issuer', e.target.value)}
                placeholder="e.g., Amazon Web Services"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <Input
                label="Issue Date"
                value={certification.date}
                onChange={(e) => handleCertificationChange(index, 'date', e.target.value)}
                type="month"
              />
              
              <Input
                label="Expiration Date"
                value={certification.expirationDate || ''}
                onChange={(e) => handleCertificationChange(index, 'expirationDate', e.target.value)}
                type="month"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Credential ID"
                value={certification.credentialId || ''}
                onChange={(e) => handleCertificationChange(index, 'credentialId', e.target.value)}
                placeholder="e.g., AWS-ASA-12345"
              />
              
              <Input
                label="Credential URL"
                value={certification.url || ''}
                onChange={(e) => handleCertificationChange(index, 'url', e.target.value)}
                placeholder="Link to verify certification"
                type="url"
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