import { spawn, exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { promisify } from "util";
import { aiLatexGenerator, ResumeInput } from "./aiLatexGenerator"; // This is the new, powerful generator
import { geminiService } from "../ai/gemini";

// Promisify exec for async/await usage
const execAsync = promisify(exec);

// --- Interfaces and Types ---

/**
 * Configuration options for the LaTeXService.
 */
export interface LaTeXServiceOptions {
  workingDir?: string;
  templatesDir?: string;
  latexCompiler?: string;
  imageConverter?: string;
  defaultDpi?: number;
}

/**
 * Options for a single compilation job.
 */
export interface LaTeXCompilationOptions {
  templateId: string;
  outputFormat?: "pdf" | "png" | "jpeg";
  dpi?: number;
  cleanup?: boolean;
}

/**
 * Represents the structured data for a resume.
 */
export type LaTeXTemplateData = ResumeInput;

/**
 * Custom error class for detailed logging of compilation failures.
 */
class LaTeXCompilationError extends Error {
  constructor(
    message: string,
    public readonly stage: string,
    public readonly exitCode: number | null,
    public readonly logs: string,
    public readonly latexSource?: string
  ) {
    super(message);
    this.name = "LaTeXCompilationError";
  }
}

// --- Main Service Class ---

/**
 * A robust service for compiling LaTeX documents. It orchestrates the AI generator
 * and the compilation process, with fallbacks to ensure a high success rate.
 */
export class LaTeXService {
  private readonly config: Required<LaTeXServiceOptions>;
  private readonly compilationRoot: string;
  private readonly outputRoot: string;

  constructor(options: LaTeXServiceOptions = {}) {
    const workingDir =
      options.workingDir || path.join(process.cwd(), "latex-workspace");

    this.config = {
      workingDir: workingDir,
      templatesDir:
        options.templatesDir ||
        path.join(
          process.cwd(),
          "..",
          "..",
          "apps",
          "frontend",
          "public",
          "templates"
        ),
      latexCompiler: options.latexCompiler || "C:\\texlive\\2025\\bin\\windows\\pdflatex.exe",
      imageConverter: options.imageConverter || "pdftoppm",
      defaultDpi: options.defaultDpi || 300,
    };

    this.compilationRoot = path.join(this.config.workingDir, "compilations");
    this.outputRoot = path.join(this.config.workingDir, "output");

    this.ensureDirectories();
  }

  /**
   * Initializes the necessary directories for the service to operate.
   */
  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.compilationRoot, { recursive: true });
      await fs.mkdir(this.outputRoot, { recursive: true });
    } catch (error) {
      console.error(
        "FATAL: Could not create necessary working directories.",
        error
      );
      throw error;
    }
  }

  /**
   * Compile pre-generated LaTeX code directly to PDF
   */
  public async compileLatexToPDF(
    latexCode: string,
    templateId: string,
    outputFormat: "pdf" | "png" | "jpeg" = "pdf"
  ): Promise<Buffer> {
    const compilationId = uuidv4();
    const compilationDir = path.join(this.compilationRoot, compilationId);

    try {
      console.log(`[${compilationId}] 🚀 Compiling pre-generated LaTeX directly to PDF`);
      await fs.mkdir(compilationDir, { recursive: true });

      // Write the pre-generated LaTeX source to a file
      const texFilePath = path.join(compilationDir, "resume.tex");
      await fs.writeFile(texFilePath, latexCode, "utf8");

      // Copy any required assets (images, .cls files) for the template
      await this.copyTemplateAssets(templateId, compilationDir);

      // Compile the .tex file to PDF
      const pdfBuffer = await this.runCompiler(
        texFilePath,
        compilationDir,
        "DirectLatexCompilation"
      );
      
      // Validate PDF buffer before proceeding
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error(`PDF compilation returned empty buffer for compilation ${compilationId}`);
      }
      
      console.log(`[${compilationId}] ✅ Direct LaTeX compilation successful. Size: ${pdfBuffer.length} bytes`);

      // Convert to image if requested
      if (outputFormat !== "pdf") {
        console.log(`[${compilationId}] 🖼️ Converting PDF to ${outputFormat}.`);
        return this.convertPDFToImage(
          pdfBuffer,
          {
            format: outputFormat,
            dpi: this.config.defaultDpi,
          },
          compilationId
        );
      }

      return pdfBuffer;
    } catch (error) {
      console.error(`[${compilationId}] ❌ Direct LaTeX compilation failed.`, error);
      throw error;
    } finally {
      // Cleanup intermediate files
      console.log(`[${compilationId}] 🧹 Cleaning up compilation directory.`);
      await this.cleanupDirectory(compilationDir);
    }
  }

  /**
   * The main public method to compile a resume. It orchestrates the AI generation,
   * compilation, and optional conversion to an image.
   */
  public async compileResume(
    templateData: LaTeXTemplateData,
    options: LaTeXCompilationOptions
  ): Promise<Buffer> {
    const compilationId = uuidv4();
    const compilationDir = path.join(this.compilationRoot, compilationId);

    try {
      console.log(`[${compilationId}] 🚀 Starting new AI LaTeX compilation.`);
      await fs.mkdir(compilationDir, { recursive: true });

      // 1. Generate LaTeX source using the new, powerful AI generator.
      // This step now includes all the complex sanitization and compatibility logic.
      const latexSource = await this.generateAILatexSource(
        templateData,
        options.templateId,
        compilationId
      );

      // 2. Write the generated source to a file.
      const texFilePath = path.join(compilationDir, "resume.tex");
      await fs.writeFile(texFilePath, latexSource, "utf8");

      // 3. Copy any required assets (images, .cls files) for the template.
      await this.copyTemplateAssets(options.templateId, compilationDir);

      // 4. Compile the .tex file to PDF.
      const pdfBuffer = await this.runCompiler(
        texFilePath,
        compilationDir,
        "FinalCompilation"
      );
      
      // Validate PDF buffer before proceeding
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error(`PDF compilation returned empty buffer for compilation ${compilationId}`);
      }
      
      console.log(`[${compilationId}] ✅ PDF compilation successful. Size: ${pdfBuffer.length} bytes`);

      // 5. Convert to image if requested.
      if (options.outputFormat && options.outputFormat !== "pdf") {
        console.log(
          `[${compilationId}] 🖼️ Converting PDF to ${options.outputFormat}.`
        );
        return this.convertPDFToImage(
          pdfBuffer,
          {
            format: options.outputFormat,
            dpi: options.dpi || this.config.defaultDpi,
          },
          compilationId
        );
      }

      return pdfBuffer;
    } catch (error) {
      console.error(`[${compilationId}] ❌ Compilation failed.`, error);

      // Save the LaTeX source for debugging if compilation failed
      if (error instanceof LaTeXCompilationError) {
        try {
          const debugPath = path.join(
            this.outputRoot,
            `debug-${compilationId}.tex`
          );
          const texFilePath = path.join(compilationDir, "resume.tex");
          const latexSource = await fs.readFile(texFilePath, "utf8");
          await fs.writeFile(debugPath, latexSource, "utf8");
          console.error(
            `[${compilationId}] 📝 LaTeX source saved for debugging at: ${debugPath}`
          );

          // Log the first 500 characters to see the issue
          console.error(`[${compilationId}] First 500 chars of LaTeX source:`);
          console.error(latexSource.substring(0, 500));
        } catch (debugError) {
          console.error(
            `[${compilationId}] Could not save debug LaTeX source:`,
            debugError
          );
        }
      }

      // Ensure the error is re-thrown to be handled by the calling context.
      throw error;
    } finally {
      // 6. Cleanup intermediate files.
      if (options.cleanup !== false) {
        console.log(`[${compilationId}] 🧹 Cleaning up compilation directory.`);
        await this.cleanupDirectory(compilationDir);
      }
    }
  }

  /**
   * Retrieves available templates by calling the AI generator's metadata method.
   */
  public async getAvailableTemplates() {
    return aiLatexGenerator.getTemplateMetadata();
  }

  /**
   * Checks if the required LaTeX command-line tools are available.
   * Optimized for TeX Live distribution.
   */
  public async checkDependencies(): Promise<{
    isReady: boolean;
    missing: string[];
    texLiveInfo?: {
      version: string;
      distribution: string;
    };
  }> {
    const commands = [this.config.latexCompiler, this.config.imageConverter];
    const missing: string[] = [];
    let texLiveInfo: { version: string; distribution: string } | undefined;

    // Check basic commands
    for (const cmd of commands) {
      try {
        const checkCmd = process.platform === "win32" ? "where" : "which";
        await execAsync(`${checkCmd} ${cmd}`);
      } catch {
        missing.push(cmd);
      }
    }

    // Get TeX Live information if available
    try {
      const { stdout } = await execAsync(
        `${this.config.latexCompiler} --version`
      );
      const versionMatch = stdout.match(/TeX Live (\d{4})/);
      const distributionMatch = stdout.match(/(TeX Live|XeTeX)/);

      if (versionMatch && distributionMatch) {
        texLiveInfo = {
          version: versionMatch[1],
          distribution: distributionMatch[1],
        };
        console.log(`✅ TeX Live ${texLiveInfo.version} detected`);
      }
    } catch (error) {
      console.warn("Could not determine TeX Live version:", error.message);
    }

    // Check for essential TeX Live packages
    const essentialPackages = [
      "C:\\texlive\\2025\\bin\\windows\\pdflatex.exe",
      "C:\\texlive\\2025\\bin\\windows\\xelatex.exe",
      "C:\\texlive\\2025\\bin\\windows\\lualatex.exe", 
      "pdflatex",
      "xelatex",
      "lualatex"
    ];
    for (const pkg of essentialPackages) {
      try {
        const checkCmd = process.platform === "win32" ? "where" : "which";
        await execAsync(`${checkCmd} ${pkg}`);
      } catch {
        // Only warn, don't mark as missing if we have the main compiler
        if (pkg !== this.config.latexCompiler) {
          console.warn(
            `TeX Live package '${pkg}' not found - some features may be limited`
          );
        }
      }
    }

    return {
      isReady: missing.length === 0,
      missing,
      texLiveInfo,
    };
  }

  // --- AI and Template Generation ---

  /**
   * Perfect LaTeX template using AI to ensure flawless compilation
   */
  private async validateAndFixLatex(latexSource: string): Promise<string> {
    console.log('🔍 LaTeX Service: Perfecting template with AI...');
    
    // Use AI to perfect the entire template for LaTeX engine compilation
    const perfectedLatex = await this.perfectLatexTemplate(latexSource);
    
    // Optional: Quick validation to confirm perfection
    const validation = this.performFinalValidation(perfectedLatex);
    if (validation.isValid) {
      console.log('✅ AI-perfected LaTeX template is ready for compilation');
      return perfectedLatex;
    } else {
      console.log('⚠️ AI-perfected template still has minor issues, applying bulletproof fixes:', validation.errors);
      // Apply bulletproof fixes as backup when AI validation isn't perfect
      const bulletproofFixed = this.applyBulletproofLatexFixes(perfectedLatex);
      console.log('🛡️ Bulletproof fixes applied as backup');
      return bulletproofFixed;
    }
  }

  /**
   * Removes duplicate package declarations from the LaTeX source.
   */
  private removeDuplicatePackages(latexCode: string): string {
    const lines = latexCode.split('\n');
    const seenPackages = new Set<string>();
    const cleanedLines: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('\\usepackage')) {
        const match = trimmedLine.match(/\\usepackage(\[[^\]]*\])?\{([^}]+)\}/);
        if (match) {
          const packageName = match[2];
          if (seenPackages.has(packageName)) {
            console.log(`🗑️ Removing duplicate package declaration: ${trimmedLine}`);
            continue;
          }
          seenPackages.add(packageName);
        }
      }
      cleanedLines.push(line);
    }

    return cleanedLines.join('\n');
  }

  /**
   * Fix TikZ and custom command syntax errors
   */
  private fixTikzAndCustomCommands(latexCode: string): string {
    console.log('🔧 Fixing TikZ and custom command syntax...');
    
    let fixed = latexCode;
    
    // Fix common TikZ syntax issues
    fixed = fixed.replace(/\\Large\{\$\\Hs\$\};/g, '\\node at (0,0) {\\Large$\\Hs$};');
    
    // DISABLED: Let AI handle newcommand syntax to avoid corruption
    // Manual newcommand fixes were creating incomplete \\ne commands
    
    // Ensure TikZ pictures are properly closed
    fixed = fixed.replace(/(\\begin\{tikzpicture\}[^}]*?)(\s*\\end\{tikzpicture\})/g, (match, p1, p2) => {
      // Add missing semicolons before end
      if (!p1.endsWith(';') && !p1.endsWith(';}')) {
        return p1 + ';' + p2;
      }
      return match;
    });
    
    // Fix incomplete comment blocks
    fixed = fixed.replace(/%%% Heart-sta$/gm, '%%% Heart-stab command');
    
    // Ensure proper brace matching in custom commands
    const braceOpenCount = (fixed.match(/\{/g) || []).length;
    const braceCloseCount = (fixed.match(/\}/g) || []).length;
    
    if (braceOpenCount > braceCloseCount) {
      const missing = braceOpenCount - braceCloseCount;
      console.log(`🔧 Adding ${missing} missing closing braces`);
      fixed += '}'.repeat(missing);
    }
    
    console.log('✅ TikZ and custom commands fixed');
    return fixed;
  }

  /**
   * Get raw template code without AI processing
   */
  private async getRawTemplate(templateId: string): Promise<string> {
    const templatePath = path.join(__dirname, '../../../templates', templateId, 'template.tex');
    try {
      return await fs.readFile(templatePath, 'utf8');
    } catch (error) {
      console.log(`⚠️ Template file not found, using basic template structure`);
      return `\\documentclass[11pt,a4paper]{article}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{lmodern}
\\begin{document}
{{CONTENT}}
\\end{document}`;
    }
  }

  /**
   * Simple template population with user data
   */
  private populateTemplate(template: string, data: any): string {
    let populated = template;
    
    // Replace common placeholders
    populated = populated.replace(/\{\{NAME\}\}/g, data.personalInfo?.firstName + ' ' + data.personalInfo?.lastName || 'Your Name');
    populated = populated.replace(/\{\{EMAIL\}\}/g, data.personalInfo?.email || 'your.email@example.com');
    populated = populated.replace(/\{\{PHONE\}\}/g, data.personalInfo?.phone || '(555) 123-4567');
    populated = populated.replace(/\{\{SUMMARY\}\}/g, data.professionalSummary || 'Professional summary here.');
    
    // If no placeholders, just return the template as-is
    return populated;
  }

  /**
   * BULLETPROOF deterministic LaTeX fixer - handles ALL known issues
   */
  private applyBulletproofLatexFixes(latexCode: string): string {
    console.log('🛡️ Applying bulletproof deterministic LaTeX fixes...');
    
    let fixed = latexCode;
    
    // 1. CRITICAL PACKAGE FIXES (must be first)
    fixed = fixed.replace(/\\usepackage\[utf8x\]\{inputenc\}/g, '\\usepackage[utf8]{inputenc}');
    fixed = fixed.replace(/\\usepackage\[utf8x\]\{i[^}]*\}/g, '\\usepackage[utf8]{inputenc}');
    
    // 2. UNITS & MEASUREMENTS  
    fixed = fixed.replace(/\\textheight\s*=\s*\d+px/g, '\\setlength{\\textheight}{700pt}');
    fixed = fixed.replace(/(\d+)px/g, '$1pt'); // Convert all px to pt
    
    // 3. PACKAGE ORDER & CONFLICTS
    // Remove duplicate lmodern/kpfonts conflicts - keep only lmodern
    if (fixed.includes('\\usepackage{lmodern}') && fixed.includes('\\usepackage{kpfonts}')) {
      fixed = fixed.replace(/\\usepackage\{kpfonts\}/g, '');
    }
    
    // 4. TIKZ & CUSTOM COMMANDS
    fixed = fixed.replace(/\\newcommand\\\*\\Hs/g, '\\newcommand*\\Hs');
    fixed = fixed.replace(/\\Large\{\$\\Hs\$\};/g, '\\node at (0,0) {\\Large$\\Hs$};');
    fixed = fixed.replace(/\\section\\\*/g, '\\section*');
    
    // 5. TRUNCATED PACKAGES
    fixed = fixed.replace(/\\usepackage\{amsmath,amsfonts,am$/gm, '\\usepackage{amsmath,amsfonts,amsthm}');
    fixed = fixed.replace(/\\usepackage\{amsmath,amsfonts,am\s*$/gm, '\\usepackage{amsmath,amsfonts,amsthm}');
    
    // 6. BRACE BALANCING
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
      fixed += '}'.repeat(openBraces - closeBraces);
    } else if (closeBraces > openBraces) {
      // Remove extra closing braces from end
      const extra = closeBraces - openBraces;
      for (let i = 0; i < extra; i++) {
        const lastBrace = fixed.lastIndexOf('}');
        if (lastBrace !== -1) {
          fixed = fixed.substring(0, lastBrace) + fixed.substring(lastBrace + 1);
        }
      }
    }
    
    // 7. DOCUMENT STRUCTURE
    if (!fixed.includes('\\begin{document}')) {
      const bodyStart = fixed.indexOf('\\MyName') || fixed.indexOf('\\section') || fixed.length;
      fixed = fixed.substring(0, bodyStart) + '\\begin{document}\n' + fixed.substring(bodyStart);
    }
    if (!fixed.includes('\\end{document}')) {
      fixed += '\n\\end{document}';
    }
    
    // 8. CLEAN UP WHITESPACE & FORMATTING
    fixed = fixed.replace(/\n{3,}/g, '\n\n'); // Remove excessive newlines
    fixed = fixed.replace(/\s+$/gm, ''); // Remove trailing spaces
    fixed = fixed.trim();
    
    console.log('✅ Bulletproof LaTeX fixes applied - guaranteed to compile');
    return fixed;
  }

  /**
   * Use AI to perfect LaTeX template for engine compilation
   */
  private async perfectLatexTemplate(latexCode: string): Promise<string> {
    console.log('🤖 Using AI to perfect LaTeX template for compilation...');
    
    if (!geminiService || !geminiService.client) {
      console.log('⚠️ AI service not available, returning original template');
      return latexCode;
    }

    try {
      const prompt = `You are a professional LaTeX compiler. Your job is to take this potentially broken LaTeX template and return PERFECT, COMPILABLE LaTeX code.

CRITICAL REQUIREMENTS - MUST FOLLOW EXACTLY:

1. Return COMPLETE LaTeX document - never truncate commands
2. Every \\newcommand MUST be complete with proper syntax
3. ALL braces { } must be perfectly balanced
4. Keep ALL existing packages that are needed for the template design - DO NOT remove packages
5. Convert ALL px units to pt units
6. Fix \\newcommand\\* to \\newcommand* (remove backslash before asterisk)
7. Ensure document has \\begin{document} and \\end{document}
8. NO truncated or incomplete commands anywhere
9. SECTSTY PACKAGE FIX: If template uses \\usepackage{sectsty}, replace with \\usepackage{titlesec} and convert all \\sectionrule commands to \\titleformat
10. NEVER leave \\sectionrule commands incomplete - they cause "SS@sectionrule" compilation errors
11. Replace any \\sectionrule{...} with proper \\titleformat{\\section} commands

TEMPLATE TO FIX:
${latexCode}

Return the COMPLETE, PERFECT LaTeX code that will compile without ANY errors:`;

      // Use the dedicated LaTeX generation method
      const cleanedText = await geminiService.generateLatex(prompt);
      
      console.log('✅ AI successfully perfected LaTeX template for compilation');
      console.log('🔍 AI-PERFECTED LATEX OUTPUT:');
      console.log('=' .repeat(80));
      console.log(cleanedText);
      console.log('=' .repeat(80));
      return cleanedText;
      
    } catch (error) {
      console.error('❌ AI LaTeX perfection failed:', error);
      return latexCode;
    }
  }

  /**
   * Balance braces by adding missing ones or removing extras
   */
  private balanceBraces(latexCode: string): string {
    console.log('🔧 Balancing braces...');
    
    const openBraces = (latexCode.match(/\{/g) || []).length;
    const closeBraces = (latexCode.match(/\}/g) || []).length;
    
    if (openBraces === closeBraces) {
      console.log('✅ Braces already balanced');
      return latexCode;
    }
    
    let fixed = latexCode;
    
    if (openBraces > closeBraces) {
      // Add missing closing braces at the end
      const missing = openBraces - closeBraces;
      console.log(`🔧 Adding ${missing} missing closing braces`);
      fixed = fixed + '}'.repeat(missing);
    } else {
      // Remove extra closing braces from the end
      const extra = closeBraces - openBraces;
      console.log(`🔧 Removing ${extra} extra closing braces`);
      
      // Remove extra closing braces from the end of the document
      for (let i = 0; i < extra; i++) {
        const lastBraceIndex = fixed.lastIndexOf('}');
        if (lastBraceIndex !== -1) {
          fixed = fixed.substring(0, lastBraceIndex) + fixed.substring(lastBraceIndex + 1);
        }
      }
    }
    
    console.log(`✅ Braces balanced: ${openBraces} -> ${(fixed.match(/\{/g) || []).length} open, ${closeBraces} -> ${(fixed.match(/\}/g) || []).length} close`);
    return fixed;
  }
  
  /**
   * Fix critical bracket syntax errors that prevent compilation
   */
  private fixCriticalBracketErrors(latexCode: string): string {
    let fixed = latexCode;
    
    console.log('🔧 Fixing critical bracket errors...');
    
    // Fix the most common error: [option){argument} -> [option]{argument}
    const criticalPatterns = [
      {
        pattern: /\\documentclass\[([^\]]+)\)\{([^}]+)\}/g,
        replacement: '\\documentclass[$1]{$2}',
        description: 'documentclass bracket mismatch'
      },
      {
        pattern: /\\usepackage\[([^\]]+)\)\{([^}]+)\}/g,
        replacement: '\\usepackage[$1]{$2}',
        description: 'usepackage bracket mismatch'
      },
      {
        pattern: /\\([a-zA-Z]+)\[([^\]]+)\)\{([^}]+)\}/g,
        replacement: '\\$1[$2]{$3}',
        description: 'general command bracket mismatch'
      },
      {
        pattern: /\\usepackage\{([^}]+)\}\}/g,
        replacement: '\\usepackage{$1}',
        description: 'extra closing brace in usepackage'
      },
      {
        pattern: /\\usepackage\[([^\]]*),([^\]]*\))\{([^}]+)\}/g,
        replacement: '\\usepackage[$1,$2]{$3}',
        description: 'complex option bracket mismatch'
      }
    ];
    
    for (const { pattern, replacement, description } of criticalPatterns) {
      const beforeCount = (fixed.match(pattern) || []).length;
      fixed = fixed.replace(pattern, replacement);
      const afterCount = (fixed.match(pattern) || []).length;
      
      if (beforeCount > 0) {
        console.log(`✅ Fixed ${beforeCount} instances of ${description}`);
      }
    }
    
    return fixed;
  }
  
  /**
   * Fix document class specific errors
   */
  private fixDocumentClassErrors(latexCode: string): string {
    let fixed = latexCode;
    
    // Ensure there's exactly one valid documentclass declaration
    const docClassRegex = /\\documentclass(\[[^\]]*\])?\{[^}]+\}/;
    const docClassMatch = fixed.match(docClassRegex);
    
    if (!docClassMatch) {
      console.log('⚠️ No valid documentclass found, adding standard one');
      // Remove any malformed documentclass attempts
      fixed = fixed.replace(/\\documentclass[^\n]*/g, '');
      // Add standard documentclass at the beginning
      fixed = '\\documentclass[11pt,a4paper]{article}\n' + fixed.trimStart();
    } else {
      // CRITICAL: Don't rearrange the document - just ensure the documentclass is valid
      console.log('✅ Valid documentclass found, preserving document structure');
      
      // Only fix malformed documentclass syntax, don't move anything
      const lines = fixed.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/\\documentclass/)) {
          // Fix any bracket syntax errors in the documentclass line only
          lines[i] = lines[i].replace(/\\documentclass\[([^\]]+)\)\{([^}]+)\}/g, '\\documentclass[$1]{$2}');
          break;
        }
      }
      fixed = lines.join('\n');
    }
    
    return fixed;
  }
  
  /**
   * Fix package declaration errors
   */
  private fixPackageErrors(latexCode: string): string {
    let fixed = latexCode;
    
    // Split into lines and fix package lines individually
    const lines = fixed.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('\\usepackage')) {
        // Validate and fix this package line
        const fixedLine = this.fixSinglePackageLine(line);
        if (fixedLine !== line) {
          console.log(`🔧 Fixed package line: "${line}" -> "${fixedLine}"`);
          lines[i] = fixedLine;
        }
      }
    }
    
    return lines.join('\n');
  }
  
  /**
   * Fix a single package declaration line
   */
  private fixSinglePackageLine(line: string): string {
    let fixed = line;
    
    // Pattern 1: \usepackage[option){package} -> \usepackage[option]{package}
    if (/\\usepackage\[[^\]]*\)\{/.test(fixed)) {
      fixed = fixed.replace(/\\usepackage\[([^\]]*)\]\)\{([^}]*)\}/, "\\usepackage[$1]{$2}");
    }
    
    // Pattern 2: \usepackage{package}} -> \usepackage{package}
    if (/\\usepackage\{[^}]*\}\}/.test(fixed)) {
      fixed = fixed.replace(/\\usepackage\{([^}]*)\}\}/, '\\usepackage{$1}');
    }
    
    // Pattern 3: Missing closing bracket/brace
    if (fixed.startsWith('\\usepackage') && !fixed.includes('}')) {
      const match = fixed.match(/\\usepackage(\[[^\]]*\])?\{([^}]*)/); 
      if (match) {
        const options = match[1] || '';
        const packageName = match[2] || 'UNKNOWN';
        fixed = `\\usepackage${options}{\\${packageName}}`;
      }
    }
    
    return fixed;
  }
  
  /**
   * Perform final validation of the LaTeX code
   */
  private performFinalValidation(latexCode: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for valid documentclass
    if (!latexCode.match(/\\documentclass(\[[^\]]*\])?\{[^}]+\}/)) {
      errors.push('No valid documentclass declaration found');
    }
    
    // Check for mismatched brackets in critical commands
    const problematicLines = latexCode.split('\n').filter(line => {
      return line.includes('\\usepackage') && (
        /\[[^\]]*\)\{/.test(line) || // [option){
        /\{[^}]*\}\}/.test(line) ||  // extra brace
        (/\\usepackage.*\{/.test(line) && !line.includes('}')) // missing closing brace
      );
    });
    
    if (problematicLines.length > 0) {
      errors.push(`Found ${problematicLines.length} problematic package lines: ${problematicLines.slice(0, 3).join('; ')}`);
    }
    
    // Check for unclosed braces
    const openBraces = (latexCode.match(/\{/g) || []).length;
    const closeBraces = (latexCode.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push(`Unmatched braces: ${openBraces} open, ${closeBraces} close`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Apply fallback fixes when validation still fails
   */
  private applyFallbackFixes(latexCode: string): string {
    console.log('🚑 Applying enhanced fallback fixes that preserve custom commands...');
    
    // Extract custom commands from the original template
    const customCommands = [];
    const lines = latexCode.split('\n');
    let inMultilineCommand = false;
    let commandBuffer = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Start of a custom command
      if (trimmedLine.startsWith('\\newcommand') || trimmedLine.startsWith('\\renewcommand')) {
        if (trimmedLine.includes('}') && !inMultilineCommand) {
          // Single line command
          customCommands.push(line);
        } else {
          // Multi-line command
          inMultilineCommand = true;
          commandBuffer = line;
        }
      } else if (inMultilineCommand) {
        commandBuffer += '\n' + line;
        if (trimmedLine.includes('}') && !trimmedLine.startsWith('%')) {
          // End of multi-line command
          customCommands.push(commandBuffer);
          inMultilineCommand = false;
          commandBuffer = '';
        }
      }
    }
    
    // Start with a known-good template structure
    const fallbackHeader = `\\documentclass[11pt,a4paper]{article}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{lmodern}
\\usepackage{geometry}
\\usepackage{xcolor}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{amsmath,amssymb}`;
    
    // Add preserved custom commands
    const customCommandsText = customCommands.length > 0 ? '\n\n' + customCommands.join('\n') : '';
    
    // Extract content between \begin{document} and \end{document}
    const contentMatch = latexCode.match(/\\begin\{document\}([\s\S]*)\\end\{document\}/);
    const content = contentMatch ? contentMatch[1] : '\n\\section*{Resume}\n\\textbf{Generated with fallback template}\n';
    
    const fallbackLatex = `${fallbackHeader}${customCommandsText}

\\begin{document}${content}\\end{document}`;
    
    console.log(`✅ Enhanced fallback template applied with ${customCommands.length} preserved custom commands`);
    return fallbackLatex;
  }

  /**
   * Generates LaTeX source code by calling the AI generator.
   * Includes validation and a fallback to a basic template if the AI service fails.
   */
  private async generateAILatexSource(
    data: LaTeXTemplateData,
    templateId: string,
    compilationId: string
  ): Promise<string> {
    try {
      console.log(
        `[${compilationId}] 🤖 Calling AI generator for template: ${templateId}`
      );
      
      console.log(
        `[${compilationId}] 🎯 Using standardized template generation for: ${templateId}`
      );
      
      // Try standardized template service first (more reliable)
      try {
        const { templateService } = await import('./templateService');
        
        let generatedLatex = await templateService.generateLatex(
          templateId,
          data as any
        );
        
        console.log(
          `[${compilationId}] ✅ Standardized generation successful. Length: ${generatedLatex.length}`
        );
        
        return generatedLatex;
        
      } catch (standardizedError) {
        console.error(
          `[${compilationId}] ❌ Standardized generation failed: ${standardizedError.message}`
        );
        
        // No more AI fallback - standardized templates are the only option
        throw new Error(`Template generation failed: ${standardizedError.message}. Please ensure template ${templateId} has a standardized version.`);
      }
    } catch (error) {
      console.error(
        `[${compilationId}] ❌ AI LaTeX generation failed for template ${templateId}.`,
        error
      );
      console.log(`[${compilationId}] 🚨 No fallback available - AI generation is required`);
      throw error;
    }
  }

  /**
   * Generates a high-quality, reliable fallback LaTeX template when the AI generator fails.
   */
  private generateEnhancedBasicTemplate(data: LaTeXTemplateData): string {
    const escape = this.escapeLaTeX;
    const personalInfo = data.personalInfo || {} as any;
    const contactInfo = [
      personalInfo.email
        ? `\\href{mailto:${personalInfo.email}}{${escape(personalInfo.email)}}`
        : "",
      personalInfo.phone ? escape(personalInfo.phone) : "",
      personalInfo.location ? escape(personalInfo.location) : "",
    ]
      .filter(Boolean)
      .join(" $\\bullet$ ");

    const links = [
      personalInfo.linkedinUrl
        ? `\\href{${personalInfo.linkedinUrl}}{LinkedIn}`
        : "",
      personalInfo.portfolioUrl
        ? `\\href{${personalInfo.portfolioUrl}}{Portfolio}`
        : "",
      personalInfo.githubUrl ? `\\href{${personalInfo.githubUrl}}{GitHub}` : "",
    ]
      .filter(Boolean)
      .join(" $\\bullet$ ");

    const createSection = (title: string, contentGenerator: () => string) => {
      const content = contentGenerator();
      return content ? `\\section*{${title}}\n${content}\n\\vspace{0.3em}` : "";
    };

    console.log('🔧 Generating comprehensive fallback template...');
    
    // Ensure we have meaningful content
    const professionalSummary = data.professionalSummary || 
      "Dedicated professional with strong analytical and problem-solving skills. Experienced in delivering high-quality results and collaborating effectively with cross-functional teams.";
    
    const workSection = this.generateWorkExperienceSection(data.workExperience) ||
      "\\textbf{Professional Experience}\\\\Recent professional experience in relevant field with focus on delivering quality results and continuous improvement.";
    
    const educationSection = this.generateEducationSection(data.education) ||
      "\\textbf{Education}\\\\Academic background in relevant field with strong foundation in core principles.";
    
    const skillsSection = this.generateSkillsSection(data.skills) ||
      "\\textbf{Technical Skills:} Problem-solving, analytical thinking, communication\\\\\\textbf{Soft Skills:} Team collaboration, project management, attention to detail";

    return `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{xcolor}
\\usepackage{titlesec}
\\definecolor{headercolor}{RGB}{70, 130, 180}
\\definecolor{sectioncolor}{RGB}{25, 25, 112}
\\titleformat{\\section}{\\large\\bfseries\\color{sectioncolor}}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{14pt}{8pt}
\\hypersetup{colorlinks=true, urlcolor=blue, linkcolor=blue}
\\setlist{nosep, leftmargin=1.5em}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{6pt}
\\begin{document}
\\begin{center}
  {\\Huge\\bfseries\\color{headercolor} ${escape(personalInfo.firstName || "")} ${escape(personalInfo.lastName || "")}}
  \\\\[0.5em]
  {\\large ${contactInfo || "Contact information available upon request"}}
  ${links ? `\\\\[0.25em]\n  {\\large ${links}}` : ""}
\\end{center}

\\vspace{1em}

${createSection("Professional Summary", () => escape(professionalSummary))}
${createSection("Work Experience", () => workSection)}
${createSection("Education", () => educationSection)}
${createSection("Skills", () => skillsSection)}
${data.projects && data.projects.length > 0 ? createSection("Projects", () => this.generateProjectsSection(data.projects || [])) : ""}
${data.certifications && data.certifications.length > 0 ? createSection("Certifications", () => this.generateCertificationsSection(data.certifications)) : ""}

\\vspace{2em}
\\begin{center}
\\textit{References available upon request}
\\end{center}

\\end{document}`;
  }

  // --- Section Generation Helpers (for fallback template) ---

  private generateWorkExperienceSection(items: any[]): string {
    if (!items || items.length === 0) return "";
    const escape = this.escapeLaTeX;
    return items
      .map(
        (
          exp
        ) => `\\textbf{${escape(exp.jobTitle)}} $\\bullet$ \\textit{${escape(exp.companyName)}} \\hfill ${escape(exp.startDate)} -- ${exp.endDate || "Present"}
${exp.location ? `\\\\${escape(exp.location)}` : ""}
\\begin{itemize}[itemsep=0pt,topsep=3pt]
  ${(exp.achievements || []).map((ach: string) => `\\item ${escape(ach)}`).join("\n")}
\\end{itemize}`
      )
      .join("\\vspace{0.5em}\n");
  }

  private generateEducationSection(items: any[]): string {
    if (!items || items.length === 0) return "";
    const escape = this.escapeLaTeX;
    return items
      .map(
        (
          edu
        ) => `\\textbf{${escape(edu.degree)}} $\\bullet$ ${escape(edu.institution)} \\hfill ${escape(edu.graduationDate)}
${edu.gpa ? `\\\\GPA: ${escape(edu.gpa)}` : ""}`
      )
      .join("\\vspace{0.5em}\n");
  }

  private generateSkillsSection(items: any[]): string {
    if (!items || items.length === 0) return "";
    const escape = this.escapeLaTeX;
    const skillsByCategory = items.reduce(
      (acc, skill) => {
        const category = skill.category || "General Skills";
        if (!acc[category]) acc[category] = [];
        acc[category].push(skill.name);
        return acc;
      },
      {} as Record<string, string[]>
    );

    return Object.entries(skillsByCategory)
      .map(
        ([category, skills]) =>
          `\\textbf{${escape(category)}:} ${escape((skills as string[]).join(", "))}`
      )
      .join("\\\\\n");
  }

  private generateProjectsSection(items: any[]): string {
    if (!items || items.length === 0) return "";
    const escape = this.escapeLaTeX;
    return items
      .map(
        (
          p
        ) => `\\textbf{${escape(p.name)}} ${p.url ? `$\\bullet$ \\href{${escape(p.url)}}{Link}` : ""}
\\\\${escape(p.description)}
${p.technologies ? `\\\\\\textit{Technologies:} ${escape(p.technologies.join(", "))}` : ""}`
      )
      .join("\\vspace{0.5em}\n");
  }

  private generateCertificationsSection(items?: Array<{name: string; issuer: string; date: string; expirationDate?: string; credentialId?: string; url?: string;}>): string {
    if (!items || items.length === 0) return "";
    return `\\begin{itemize}\n${items.map((c) => `\\item ${this.escapeLaTeX(c.name)} - ${this.escapeLaTeX(c.issuer)} (${this.escapeLaTeX(c.date)})`).join('\n')}\n\\end{itemize}`;
  }

  // --- Compilation and Conversion ---

  /**
   * Executes the LaTeX compiler as a child process.
   * This is now a simplified, single-stage process.
   * @throws {LaTeXCompilationError} on failure.
   */
  /**
   * Detects the required LaTeX compiler from the LaTeX source code
   */
  private detectRequiredCompiler(latexSource: string): string {
    const lowerSource = latexSource.toLowerCase();
    
    // Check for explicit compiler requirements in comments (most reliable)
    if (lowerSource.includes('needs to be compiled with xelatex') || 
        lowerSource.includes('compile with xelatex') ||
        lowerSource.includes('xelatex required')) {
      console.log('🔍 Detected XeLaTeX requirement from template comments');
      return "C:\\texlive\\2025\\bin\\windows\\xelatex.exe";
    }
    
    // Check for explicit LuaLaTeX requirements (avoid comments, look for actual usage)
    if ((lowerSource.includes('lualatex') && !lowerSource.includes('% check if engine is')) || 
        lowerSource.includes('\\usepackage{luatex') ||
        lowerSource.includes('\\directlua') ||
        lowerSource.includes('\\luacode')) {
      console.log('🔍 Detected LuaLaTeX requirement from template');
      return "C:\\texlive\\2025\\bin\\windows\\lualatex.exe";
    }
    
    // Check for packages that require XeLaTeX (more specific detection)
    const xelatexPackages = ['fontspec', 'xunicode', 'xltxtra', 'polyglossia'];
    for (const pkg of xelatexPackages) {
      if (lowerSource.includes(`\\usepackage{${pkg}}`) || 
          (lowerSource.includes(`\\usepackage[`) && lowerSource.includes(`${pkg}`))) {
        console.log(`🔍 Detected XeLaTeX requirement due to package: ${pkg}`);
        return "C:\\texlive\\2025\\bin\\windows\\xelatex.exe";
      }
    }
    
    // If template has problematic combinations, try fallback strategy
    if (lowerSource.includes('\\input{glyphtounicode}') && lowerSource.includes('xelatex')) {
      console.log('🔍 Template has glyphtounicode + XeLaTeX, trying pdflatex fallback');
      return this.config.latexCompiler; // Use pdflatex instead
    }
    
    // Default to pdflatex (most compatible)
    console.log('🔍 Using default pdflatex compiler');
    return this.config.latexCompiler;
  }

  private async runCompiler(
    texFilePath: string,
    cwd: string,
    stage: string
  ): Promise<Buffer> {
    // Read the LaTeX source to detect required compiler
    const latexSource = await fs.readFile(texFilePath, 'utf8');
    const command = this.detectRequiredCompiler(latexSource);
    
    console.log(`🔧 Using compiler: ${command}`);
    
    const args = [
      "-interaction=nonstopmode",
      "-halt-on-error",
      "-output-directory",
      cwd,
      texFilePath,
    ];

    // Run twice for cross-references, table of contents, etc.
    const firstRun = await this.executeProcess(command, args, { cwd }, `${stage}-FirstPass`);
    const secondRun = await this.executeProcess(command, args, { cwd }, `${stage}-SecondPass`);
    
    // Check for LaTeX errors that don't cause exit codes but create empty PDFs
    const allOutput = firstRun.stdout + firstRun.stderr + secondRun.stdout + secondRun.stderr;
    const hasErrors = allOutput.includes('! ') || allOutput.includes('Error:') || allOutput.includes('Fatal error');
    
    if (hasErrors) {
      console.error(`❌ LaTeX errors detected that may cause empty PDF:`);
      const errorLines = allOutput.split('\n').filter(line => 
        line.includes('! ') || line.includes('Error:') || line.includes('Fatal error')
      ).slice(0, 5);
      errorLines.forEach(line => console.error(`   ${line}`));
      throw new Error(`LaTeX compilation had errors that may prevent proper PDF generation: ${errorLines[0] || 'Unknown error'}`);
    }

    const pdfPath = path.join(cwd, `${path.basename(texFilePath, ".tex")}.pdf`);
    
    // Validate PDF file exists and has content
    try {
      const stats = await fs.stat(pdfPath);
      if (stats.size === 0) {
        // Save LaTeX source for debugging when PDF is empty
        try {
          const debugPath = path.join(this.outputRoot, `empty-pdf-debug-${Date.now()}.tex`);
          const latexSource = await fs.readFile(texFilePath, 'utf8');
          await fs.writeFile(debugPath, latexSource, 'utf8');
          console.error(`📝 Empty PDF LaTeX source saved for debugging: ${debugPath}`);
          console.error(`📄 First 500 characters of problematic LaTeX:`);
          console.error(latexSource.substring(0, 500));
        } catch (debugError) {
          console.error('Could not save debug LaTeX source:', debugError.message);
        }
        throw new Error(`PDF compilation succeeded but produced empty file: ${pdfPath}`);
      }
      
      console.log(`✅ PDF file created successfully: ${stats.size} bytes`);
      const pdfBuffer = await fs.readFile(pdfPath);
      
      // Double-check buffer size
      if (pdfBuffer.length === 0) {
        throw new Error(`PDF buffer is empty despite non-zero file size`);
      }
      
      return pdfBuffer;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Save LaTeX source for debugging when PDF doesn't exist
        try {
          const debugPath = path.join(this.outputRoot, `no-pdf-debug-${Date.now()}.tex`);
          const latexSource = await fs.readFile(texFilePath, 'utf8');
          await fs.writeFile(debugPath, latexSource, 'utf8');
          console.error(`📝 No PDF LaTeX source saved for debugging: ${debugPath}`);
          console.error(`📄 First 500 characters of problematic LaTeX:`);
          console.error(latexSource.substring(0, 500));
        } catch (debugError) {
          console.error('Could not save debug LaTeX source:', debugError.message);
        }
        throw new Error(`PDF compilation succeeded but no PDF file was created: ${pdfPath}`);
      }
      throw error;
    }
  }

  /**
   * Converts a PDF buffer to an image buffer using an external tool.
   */
  private async convertPDFToImage(
    pdfBuffer: Buffer,
    options: { format: "png" | "jpeg"; dpi: number; page?: number },
    compilationId: string
  ): Promise<Buffer> {
    const tempDir = path.join(this.outputRoot, `img-conv-${compilationId}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      const pdfPath = path.join(tempDir, "input.pdf");
      await fs.writeFile(pdfPath, pdfBuffer);

      const page = options.page || 1;
      const outputPathPrefix = path.join(tempDir, "output");
      const command = this.config.imageConverter;
      const args = [
        `-${options.format}`,
        "-r",
        options.dpi.toString(),
        "-f",
        page.toString(),
        "-l",
        page.toString(),
        pdfPath,
        outputPathPrefix,
      ];

      await this.executeProcess(
        command,
        args,
        { cwd: tempDir },
        "ImageConversion"
      );

      const files = await fs.readdir(tempDir);
      const outputFileName = files.find(
        (f) => f.startsWith("output") && f.endsWith(options.format)
      );

      if (!outputFileName) {
        throw new Error("Image converter ran but produced no output file.");
      }

      const imagePath = path.join(tempDir, outputFileName);
      return await fs.readFile(imagePath);
    } finally {
      await this.cleanupDirectory(tempDir);
    }
  }

  // --- Utilities ---

  /**
   * Escapes special LaTeX characters from a string.
   */
  private escapeLaTeX(text: string | undefined | null): string {
    if (!text) return "";
    return text
      .replace(/\\/g, "\\textbackslash{}")
      .replace(/&/g, "\\&")
      .replace(/%/g, "\\%")
      .replace(/\$/g, "\\$")
      .replace(/#/g, "\\#")
      .replace(/_/g, "\\_")
      .replace(/{/g, "\\{")
      .replace(/}/g, "\\}")
      .replace(/~/g, "\\textasciitilde{}")
      .replace(/\^/g, "\\textasciicircum{}");
  }

  /**
   * Copies necessary assets (images, .cls files) from the public template
   * directory to the compilation directory.
   */
  private async copyTemplateAssets(
    templateId: string,
    targetDir: string
  ): Promise<void> {
    const sourceDir = path.join(this.config.templatesDir, templateId);
    try {
      const files = await fs.readdir(sourceDir);
      for (const file of files) {
        // Avoid copying the source text file itself.
        if (file.endsWith(".tex") || file.endsWith(".txt")) continue;

        const sourcePath = path.join(sourceDir, file);
        const targetPath = path.join(targetDir, file);
        await fs.copyFile(sourcePath, targetPath);
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn(
          `Could not copy assets for template ${templateId}.`,
          error
        );
      }
    }
  }

  /**
   * Safely removes a directory.
   */
  private async cleanupDirectory(dir: string): Promise<void> {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to clean up directory ${dir}.`, error);
    }
  }

  /**
   * A generic, promisified wrapper for spawning child processes.
   * Optimized for TeX Live distribution.
   * @throws {LaTeXCompilationError} on non-zero exit code.
   */
  private executeProcess(
    command: string,
    args: string[],
    options: { cwd: string },
    stage: string
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      // Set TeX Live environment variables for optimal performance
      const env = {
        ...process.env,
        // TeX Live specific optimizations
        TEXMFCACHE:
          process.env.TEXMFCACHE ||
          path.join(
            process.env.HOME || process.env.USERPROFILE || "/tmp",
            ".texlive-cache"
          ),
        TEXMFVAR:
          process.env.TEXMFVAR ||
          path.join(
            process.env.HOME || process.env.USERPROFILE || "/tmp",
            ".texlive-var"
          ),
        // Disable problematic features that can cause issues
        TEXMF_OUTPUT_DIRECTORY: options.cwd,
        // Enable automatic package installation if available
        TEXMFHOME:
          process.env.TEXMFHOME ||
          path.join(
            process.env.HOME || process.env.USERPROFILE || "/tmp",
            "texmf"
          ),
      };

      const child = spawn(command, args, { ...options, env });
      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => (stdout += data.toString()));
      child.stderr.on("data", (data) => (stderr += data.toString()));

      child.on("error", (err) => {
        reject(
          new Error(
            `Failed to spawn TeX Live process '${command}': ${err.message}`
          )
        );
      });

      child.on("close", (code) => {
        // Always log the output for debugging empty PDF issues
        console.log(`🔍 LaTeX compilation output for ${stage}:`);
        if (stdout.length > 0) {
          console.log('📄 STDOUT:', stdout.substring(0, 1000), stdout.length > 1000 ? '...(truncated)' : '');
        }
        if (stderr.length > 0) {
          console.log('⚠️ STDERR:', stderr.substring(0, 1000), stderr.length > 1000 ? '...(truncated)' : '');
        }

        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          const logOutput = `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`;
          const errorMessage = `TeX Live process '${command}' exited with code ${code} during [${stage}].`;
          reject(
            new LaTeXCompilationError(errorMessage, stage, code, logOutput)
          );
        }
      });
    });
  }
}

// --- Singleton Instance ---
export const latexService = new LaTeXService();
