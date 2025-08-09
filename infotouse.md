turbo run build
Attention:
Turborepo now collects completely anonymous telemetry regarding usage.
This information is used to shape the Turborepo roadmap and prioritize features.
You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
https://turbo.build/repo/docs/telemetry
• Packages in scope: @ai-job-suite/backend, @ai-job-suite/frontend
• Running build in 2 packages
• Remote caching disabled
@ai-job-suite/frontend:build: cache miss, executing cb25eade630960b2
@ai-job-suite/backend:build: cache miss, executing 9f9c10c114b20e59
@ai-job-suite/backend:build:
@ai-job-suite/backend:build: > @ai-job-suite/backend@1.0.0 build /opt/render/project/src/apps/backend
@ai-job-suite/backend:build: > tsc
@ai-job-suite/backend:build:
@ai-job-suite/frontend:build:
@ai-job-suite/frontend:build: > @ai-job-suite/frontend@1.0.0 build /opt/render/project/src/apps/frontend
@ai-job-suite/frontend:build: > vite build
@ai-job-suite/frontend:build:
@ai-job-suite/frontend:build: vite v5.4.19 building for production...
@ai-job-suite/frontend:build: transforming...
@ai-job-suite/frontend:build: ✓ 1840 modules transformed.
@ai-job-suite/frontend:build: [plugin:vite:reporter] [plugin vite:reporter]
@ai-job-suite/frontend:build: (!) /opt/render/project/src/apps/frontend/src/services/resumeService.ts is dynamically imported by /opt/render/project/src/apps/frontend/src/contexts/ResumeContext.tsx but also statically imported by /opt/render/project/src/apps/frontend/src/components/career-coach/ResumeDisplay.tsx, /opt/render/project/src/apps/frontend/src/components/documents/CoverLetterEditor.tsx, /opt/render/project/src/apps/frontend/src/components/documents/ResumePDFPreviewSimple.tsx, /opt/render/project/src/apps/frontend/src/components/resume/ATSCompatibilityChecker.tsx, /opt/render/project/src/apps/frontend/src/components/resume/EnhancedResumePreview.tsx, /opt/render/project/src/apps/frontend/src/components/resume/EnterpriseResumeEnhancer.tsx, /opt/render/project/src/apps/frontend/src/components/resume/JobOptimizationModal.tsx, /opt/render/project/src/apps/frontend/src/components/resume/ProfessionalSummaryForm.tsx, /opt/render/project/src/apps/frontend/src/components/resume/ResumeDownloadManager.tsx, /opt/render/project/src/apps/frontend/src/pages/DocumentManager.tsx, /opt/render/project/src/apps/frontend/src/pages/resume-builder/ComprehensiveResumeBuilder.tsx, /opt/render/project/src/apps/frontend/src/pages/resume-builder/ResumePreviewPage.tsx, /opt/render/project/src/apps/frontend/src/pages/resume-builder/TemplateSelection.tsx, /opt/render/project/src/apps/frontend/src/stores/resumeStore.ts, dynamic import will not move module into another chunk.
@ai-job-suite/frontend:build:
@ai-job-suite/frontend:build: rendering chunks...
@ai-job-suite/frontend:build: computing gzip size...
@ai-job-suite/frontend:build: dist/index.html 0.79 kB │ gzip: 0.48 kB
@ai-job-suite/frontend:build: dist/assets/index-DM1yWzTi.css 148.22 kB │ gzip: 20.17 kB
@ai-job-suite/frontend:build: dist/assets/index-7p3EW3WL.js 1,614.43 kB │ gzip: 428.92 kB │ map: 5,879.98 kB
@ai-job-suite/frontend:build:
@ai-job-suite/frontend:build: (!) Some chunks are larger than 500 kB after minification. Consider:
@ai-job-suite/frontend:build: - Using dynamic import() to code-split the application
@ai-job-suite/frontend:build: - Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
@ai-job-suite/frontend:build: - Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
@ai-job-suite/frontend:build: ✓ built in 16.92s
Tasks: 2 successful, 2 total
Cached: 0 cached, 2 total
Time: 19.645s
==> Uploading build...
==> Uploaded in 7.1s. Compression took 8.1s
==> Build successful 🎉
==> Deploying...
==> Running 'pnpm start'
==> Exited with status 1
==> Common ways to troubleshoot your deploy: https://render.com/docs/troubleshooting-deploys
 ERR_PNPM_NO_SCRIPT_OR_SERVER  Missing script start or file server.js
==> Running 'pnpm start'
