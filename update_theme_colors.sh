#!/bin/bash

# Script to systematically update all color patterns from black/purple theme to gray glassmorphism with emerald/teal

echo "Starting systematic color theme update..."

# Define the source directory
SRC_DIR="C:/Users/ngwen/MyProjects/ai-job-suite/apps/frontend/src"

# Find all .tsx and .ts files in the source directory
FILES=$(find "$SRC_DIR" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \))

echo "Found $(echo "$FILES" | wc -l) files to process"

# Process each file
for file in $FILES; do
    echo "Processing: $file"
    
    # Create a temporary file for edits
    temp_file="${file}.tmp"
    cp "$file" "$temp_file"
    
    # Background Colors
    sed -i 's/bg-black\b/bg-gray-900/g' "$temp_file"
    sed -i 's/bg-dark-primary\b/bg-gray-900/g' "$temp_file"
    sed -i 's/bg-dark-secondary\b/bg-gray-800/g' "$temp_file"
    sed -i 's/bg-dark-tertiary\b/bg-gray-700/g' "$temp_file"
    
    # Glassmorphism Effects
    sed -i 's/bg-black\/10/bg-gray-800\/20/g' "$temp_file"
    sed -i 's/bg-black\/20/bg-gray-800\/30/g' "$temp_file"
    sed -i 's/bg-black\/30/bg-gray-800\/40/g' "$temp_file"
    sed -i 's/bg-black\/40/bg-gray-700\/50/g' "$temp_file"
    sed -i 's/bg-black\/50/bg-gray-700\/60/g' "$temp_file"
    sed -i 's/bg-black\/80/bg-gray-900\/90/g' "$temp_file"
    
    # Purple/Blue to Emerald/Teal Colors
    sed -i 's/bg-purple-500/bg-emerald-500/g' "$temp_file"
    sed -i 's/bg-purple-600/bg-emerald-600/g' "$temp_file"
    sed -i 's/bg-blue-500/bg-teal-500/g' "$temp_file"
    sed -i 's/bg-blue-600/bg-teal-600/g' "$temp_file"
    sed -i 's/text-purple-/text-emerald-/g' "$temp_file"
    sed -i 's/text-blue-/text-teal-/g' "$temp_file"
    sed -i 's/border-purple-/border-emerald-/g' "$temp_file"
    sed -i 's/border-blue-/border-teal-/g' "$temp_file"
    sed -i 's/from-purple-/from-emerald-/g' "$temp_file"
    sed -i 's/to-blue-/to-teal-/g' "$temp_file"
    sed -i 's/via-purple-/via-emerald-/g' "$temp_file"
    
    # Hover States
    sed -i 's/hover:bg-black\//hover:bg-gray-800\//g' "$temp_file"
    sed -i 's/hover:from-purple-/hover:from-emerald-/g' "$temp_file"
    sed -i 's/hover:to-blue-/hover:to-teal-/g' "$temp_file"
    
    # Focus and Ring Colors
    sed -i 's/ring-purple-/ring-emerald-/g' "$temp_file"
    sed -i 's/ring-blue-/ring-teal-/g' "$temp_file"
    sed -i 's/focus:ring-purple-/focus:ring-emerald-/g' "$temp_file"
    sed -i 's/focus:border-purple-/focus:border-emerald-/g' "$temp_file"
    
    # Replace the original file if changes were made
    if ! cmp -s "$file" "$temp_file"; then
        mv "$temp_file" "$file"
        echo "  ✓ Updated $file"
    else
        rm "$temp_file"
        echo "  - No changes needed for $file"
    fi
done

echo "Color theme update completed!"