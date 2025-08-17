#!/bin/bash

# Targeted script for remaining files with old color patterns
FILES=(
    "C:/Users/ngwen/MyProjects/ai-job-suite/apps/frontend/src/pages/LandingPageSimple.tsx"
    "C:/Users/ngwen/MyProjects/ai-job-suite/apps/frontend/src/index.css"
    "C:/Users/ngwen/MyProjects/ai-job-suite/apps/frontend/src/components/pdf-editor/ConvertPDFTool.tsx"
    "C:/Users/ngwen/MyProjects/ai-job-suite/apps/frontend/src/components/pdf-editor/SplitPDFTool.tsx"
    "C:/Users/ngwen/MyProjects/ai-job-suite/apps/frontend/src/components/pdf-editor/CompressPDFTool.tsx"
    "C:/Users/ngwen/MyProjects/ai-job-suite/apps/frontend/src/components/pdf-editor/PDFEditor.tsx"
    "C:/Users/ngwen/MyProjects/ai-job-suite/apps/frontend/src/components/pdf-editor/MergePDFTool.tsx"
    "C:/Users/ngwen/MyProjects/ai-job-suite/apps/frontend/src/components/pdf-editor/DeletePagesTool.tsx"
    "C:/Users/ngwen/MyProjects/ai-job-suite/apps/frontend/src/pages/VerifyEmail.tsx"
    "C:/Users/ngwen/MyProjects/ai-job-suite/apps/frontend/src/pages/resume-builder/UploadResume.tsx"
    "C:/Users/ngwen/MyProjects/ai-job-suite/apps/frontend/src/pages/resume-builder/TemplateSelection.tsx"
    "C:/Users/ngwen/MyProjects/ai-job-suite/apps/frontend/src/pages/resume-builder/ResumeBuilder.tsx"
    "C:/Users/ngwen/MyProjects/ai-job-suite/apps/frontend/src/pages/resume-builder/CreateResume.tsx"
    "C:/Users/ngwen/MyProjects/ai-job-suite/apps/frontend/src/pages/resume-builder/ComprehensiveResumeBuilder.tsx"
    "C:/Users/ngwen/MyProjects/ai-job-suite/apps/frontend/src/pages/ResendVerification.tsx"
)

echo "Processing remaining files with old color patterns..."

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "Processing: $file"
        
        # All color pattern replacements in one go for each file
        sed -i \
            -e 's/bg-black\b/bg-gray-900/g' \
            -e 's/bg-dark-primary\b/bg-gray-900/g' \
            -e 's/bg-dark-secondary\b/bg-gray-800/g' \
            -e 's/bg-dark-tertiary\b/bg-gray-700/g' \
            -e 's/bg-black\/10/bg-gray-800\/20/g' \
            -e 's/bg-black\/20/bg-gray-800\/30/g' \
            -e 's/bg-black\/30/bg-gray-800\/40/g' \
            -e 's/bg-black\/40/bg-gray-700\/50/g' \
            -e 's/bg-black\/50/bg-gray-700\/60/g' \
            -e 's/bg-black\/80/bg-gray-900\/90/g' \
            -e 's/bg-purple-500/bg-emerald-500/g' \
            -e 's/bg-purple-600/bg-emerald-600/g' \
            -e 's/bg-blue-500/bg-teal-500/g' \
            -e 's/bg-blue-600/bg-teal-600/g' \
            -e 's/text-purple-/text-emerald-/g' \
            -e 's/text-blue-/text-teal-/g' \
            -e 's/border-purple-/border-emerald-/g' \
            -e 's/border-blue-/border-teal-/g' \
            -e 's/from-purple-/from-emerald-/g' \
            -e 's/to-blue-/to-teal-/g' \
            -e 's/via-purple-/via-emerald-/g' \
            -e 's/hover:bg-black\//hover:bg-gray-800\//g' \
            -e 's/hover:from-purple-/hover:from-emerald-/g' \
            -e 's/hover:to-blue-/hover:to-teal-/g' \
            -e 's/ring-purple-/ring-emerald-/g' \
            -e 's/ring-blue-/ring-teal-/g' \
            -e 's/focus:ring-purple-/focus:ring-emerald-/g' \
            -e 's/focus:border-purple-/focus:border-emerald-/g' \
            "$file"
        
        echo "  ✓ Updated $file"
    else
        echo "  ! File not found: $file"
    fi
done

echo "Remaining files processing completed!"