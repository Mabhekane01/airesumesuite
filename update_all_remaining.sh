#!/bin/bash

# Complete the color theme update for all remaining files

echo "Updating all remaining files with old color patterns..."

# Find all files that still contain old patterns
FILES=$(grep -r -l "bg-black\|bg-dark-primary\|bg-dark-secondary\|bg-dark-tertiary" "C:/Users/ngwen/MyProjects/ai-job-suite/apps/frontend/src" --include="*.tsx" --include="*.ts" --include="*.css")

echo "Found files needing updates:"
echo "$FILES"
echo ""

# Process each file
while IFS= read -r file; do
    if [ -f "$file" ]; then
        echo "Processing: $file"
        
        # Apply all transformations in one sed command for efficiency
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
    fi
done <<< "$FILES"

echo ""
echo "All remaining files updated successfully!"