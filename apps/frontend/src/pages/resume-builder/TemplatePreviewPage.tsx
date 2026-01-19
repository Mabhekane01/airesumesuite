import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeftIcon, ArrowRightIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { resumeService } from '../../services/resumeService';

type TemplateMeta = {
  id: string;
  name?: string;
  description?: string;
  category?: string;
  screenshotUrl?: string;
  previewUrl?: string;
  preview?: {
    screenshotUrl?: string;
    thumbnailUrl?: string;
  };
};

export default function TemplatePreviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { templateId } = useParams<{ templateId: string }>();
  const [templateMeta, setTemplateMeta] = useState<TemplateMeta | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const resumeDataFromState = location.state?.resumeData;
  const previewImage =
    templateMeta?.preview?.screenshotUrl || templateMeta?.previewUrl || templateMeta?.screenshotUrl;

  useEffect(() => {
    const loadTemplateInfo = async () => {
      if (!templateId) {
        setLoadingMeta(false);
        return;
      }
      try {
        const templates = await resumeService.getAvailableLatexTemplates();
        const match = templates.find((template: any) => template.id === templateId);
        setTemplateMeta(match || { id: templateId });
      } catch {
        setTemplateMeta({ id: templateId });
      } finally {
        setLoadingMeta(false);
      }
    };

    loadTemplateInfo();
  }, [templateId]);

  const isPublicPreview = location.pathname.startsWith('/templates/');
  const backPath = isPublicPreview ? '/templates' : '/dashboard/resume/templates';

  if (!templateId) {
    return (
      <div className="min-h-screen bg-[#FAFAFB] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-surface-200 p-12 rounded-[3rem] text-center shadow-sm">
          <h2 className="text-2xl font-black text-brand-dark mb-2">Template Not Found.</h2>
          <p className="text-text-secondary font-bold mb-8 opacity-80">Select a template to preview the full PDF.</p>
          <button onClick={() => navigate(backPath)} className="btn-primary px-8 py-3 text-[10px] font-black uppercase tracking-widest">Return to Templates</button>
        </div>
      </div>
    );
  }

  const templateTitle = templateMeta?.name || `Template ${templateId.replace('template', '')}`;
  const templateDescription = templateMeta?.description || 'Preview the full PDF sample for this template.';

  return (
    <div className="min-h-screen bg-[#F7F7FA] pb-24 animate-slide-up-soft relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute -top-32 -right-32 w-[680px] h-[680px] bg-brand-blue/[0.06] rounded-full blur-[140px]" />
        <div className="absolute top-16 -left-24 w-[520px] h-[520px] bg-brand-purple/[0.05] rounded-full blur-[140px]" />
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-10 pt-6 md:pt-14 space-y-8 md:space-y-12 relative z-10">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="space-y-3">
              <button
                onClick={() => navigate(backPath)}
                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary hover:text-brand-blue transition-colors"
              >
                <ChevronLeftIcon className="w-4 h-4" />
                Back to Templates
              </button>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl md:text-5xl font-display font-black text-brand-dark tracking-tight">
                  {templateTitle}
                </h1>
                <span className="px-3 py-1 rounded-full bg-brand-success/10 text-[9px] font-black text-brand-success uppercase tracking-[0.2em]">
                  Sample
                </span>
              </div>
              <p className="text-base md:text-lg text-text-secondary font-semibold max-w-2xl">
                {loadingMeta ? 'Loading template details...' : templateDescription}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => navigate(backPath)}
                variant="outline"
                className="px-5 md:px-7 py-3 font-black text-[9px] uppercase tracking-[0.2em] bg-white border-2 border-surface-200 rounded-xl text-brand-dark hover:border-brand-dark hover:bg-surface-50 transition-all duration-300"
              >
                Back
              </Button>
              <Button
                onClick={() => {
                  const builderPath = '/dashboard/resume/comprehensive';
                  navigate(builderPath, {
                    state: {
                      resumeData: resumeDataFromState
                        ? { ...resumeDataFromState, templateId, isLatexTemplate: true }
                        : undefined,
                      templateId,
                      isLatexTemplate: true
                    }
                  });
                }}
                className="btn-primary px-5 md:px-7 py-3 font-black text-[9px] uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 flex items-center justify-center gap-2 rounded-xl"
              >
                Use This Template
                <ArrowRightIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 md:-inset-10 bg-white/70 rounded-[2.5rem] md:rounded-[3.5rem] blur-2xl" />
          <div className="relative">
            {previewImage ? (
              <div className="flex justify-center">
                <img
                  src={previewImage.startsWith('http') ? previewImage : `/${previewImage.replace(/^\//, '')}`}
                  alt={`${templateTitle} sample`}
                  className="w-full max-w-[880px] h-auto object-contain"
                  style={{ aspectRatio: '1 / 1.414' }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center w-full min-h-[650px] md:min-h-[900px] bg-white rounded-[1.5rem] md:rounded-[2rem] border-2 border-dashed border-surface-200">
                <div className="text-center space-y-4 opacity-60">
                  <div className="w-20 h-20 bg-surface-50 rounded-[2rem] flex items-center justify-center mx-auto text-text-tertiary">
                    <DocumentTextIcon className="h-10 w-10" />
                  </div>
                  <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">
                    Sample image not available
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
